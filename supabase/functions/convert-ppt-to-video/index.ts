// Convert an uploaded .pptx module into a narrated MP4 — fully self-hosted, free.
// This function is a THIN TRIGGER: it creates the job row and hands the whole job
// to the self-hosted edge-tts service's /build-module endpoint, which renders
// (LibreOffice), narrates (speaker notes, else Gemini from slide text, else slide
// text) via edge-tts, stitches with ffmpeg, uploads the MP4 to storage, and
// updates the job row itself — all in a background task on that service.
//
// Why: doing the long render here would exceed the edge-function wall-clock limit
// and leave jobs stuck at "processing". Handing it off keeps this function fast
// (returns in ~1s) and the heavy work runs where there is no such limit.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // RBAC
    const allowedRoles = ["sme", "sme_expert", "manager", "admin"] as const;
    let hasAccess = false;
    for (const role of allowedRoles) {
      const { data } = await adminClient.rpc("has_role", { _user_id: authData.user.id, _role: role });
      if (data) { hasAccess = true; break; }
    }
    if (!hasAccess) return json({ error: "Forbidden" }, 403);

    const { moduleId } = await req.json();
    if (!moduleId) return json({ error: "moduleId is required" }, 400);

    const { data: mod, error: modErr } = await adminClient
      .from("modules")
      .select("id, title, module_type, file_url, slides")
      .eq("id", moduleId)
      .single();
    if (modErr || !mod) return json({ error: "Module not found" }, 404);
    if (mod.module_type !== "ppt") return json({ error: "Module is not a PPT" }, 400);

    const slidesMeta = (mod.slides || {}) as any;
    const pptUrl: string = mod.file_url || slidesMeta.fileUrl;
    if (!pptUrl) return json({ error: "Module has no PPT file" }, 400);

    const TTS_SERVICE_URL = Deno.env.get("TTS_SERVICE_URL");
    const TTS_SHARED_SECRET = Deno.env.get("TTS_SHARED_SECRET");
    if (!TTS_SERVICE_URL || !TTS_SHARED_SECRET) {
      return json({ error: "Missing config (TTS_SERVICE_URL, TTS_SHARED_SECRET)" }, 400);
    }
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || null;

    const speakerNotes = Array.isArray(slidesMeta.speakerNotes) ? slidesMeta.speakerNotes : [];

    // Create the job row the client polls.
    const { data: job, error: jobErr } = await adminClient
      .from("video_generation_jobs")
      .insert({
        module_id: moduleId,
        status: "processing",
        scene_total: speakerNotes.length || slidesMeta.slideCount || 0,
        scene_completed: 0,
        current_step: "Queued…",
      })
      .select("id")
      .single();
    if (jobErr || !job) return json({ error: "Failed to create job" }, 500);
    const jobId = job.id;

    // Hand the whole job to the self-hosted service (it runs in the background and
    // updates this job row). Short timeout — it returns 202 almost immediately.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(`${TTS_SERVICE_URL.replace(/\/$/, "")}/build-module`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": TTS_SHARED_SECRET },
        signal: controller.signal,
        body: JSON.stringify({
          moduleId,
          jobId,
          pptxUrl: pptUrl,
          supabaseUrl,
          supabaseServiceKey: serviceRoleKey,
          speakerNotes,
          narrationLanguage: slidesMeta.narrationLanguage || "en",
          narrationVoiceDescription: slidesMeta.narrationVoiceDescription || null,
          geminiApiKey: GEMINI_API_KEY,
          deckTitle: mod.title || "Lesson",
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        await adminClient.from("video_generation_jobs").update({
          status: "failed", error_message: `Build service rejected job [${res.status}]: ${t.slice(0, 200)}`,
        }).eq("id", jobId);
        return json({ error: `Build service rejected job [${res.status}]`, jobId }, 502);
      }
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      const msg = aborted ? "Build service did not respond (timeout)" : `Build service error: ${err instanceof Error ? err.message : err}`;
      await adminClient.from("video_generation_jobs").update({
        status: "failed", error_message: msg,
      }).eq("id", jobId);
      return json({ error: msg, jobId }, 502);
    } finally {
      clearTimeout(timeout);
    }

    return json({ jobId, status: "processing" }, 202);
  } catch (e) {
    console.error("convert-ppt-to-video error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
