import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get job
    const { data: job, error: jobError } = await adminClient
      .from("video_generation_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If already completed or failed, return status
    if (job.status === "completed" || job.status === "failed") {
      return new Response(JSON.stringify({
        status: job.status,
        outputVideoUrl: job.output_video_url,
        errorMessage: job.error_message,
        progress: job.progress,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const renderId = job.shotstack_render_id;
    if (!renderId) {
      return new Response(JSON.stringify({
        status: job.status,
        currentStep: job.current_step,
        progress: job.progress,
        sceneCompleted: job.scene_completed,
        sceneTotal: job.scene_total,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check Shotstack render status
    const SHOTSTACK_API_KEY = Deno.env.get("SHOTSTACK_API_KEY");
    if (!SHOTSTACK_API_KEY) {
      return new Response(JSON.stringify({ error: "SHOTSTACK_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statusRes = await fetch(`https://api.shotstack.io/edit/stage/render/${renderId}`, {
      headers: { "x-api-key": SHOTSTACK_API_KEY },
    });

    if (!statusRes.ok) {
      const errText = await statusRes.text();
      console.error("Shotstack status check failed:", statusRes.status, errText);
      return new Response(JSON.stringify({
        status: "rendering",
        currentStep: "Checking render status...",
        progress: job.progress,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const statusData = await statusRes.json();
    const renderStatus = statusData.response?.status;

    if (renderStatus === "done") {
      const videoUrl = statusData.response?.url;

      if (videoUrl) {
        // Download and upload to our storage
        const videoBuffer = await fetch(videoUrl).then(r => r.arrayBuffer());
        const fileName = `video-gen/${job.module_id}/final.mp4`;

        await adminClient.storage.from("module-files").upload(fileName, new Uint8Array(videoBuffer), {
          contentType: "video/mp4", upsert: true,
        });

        const { data: urlData } = adminClient.storage.from("module-files").getPublicUrl(fileName);
        const finalUrl = urlData.publicUrl;

        // Update job
        await adminClient.from("video_generation_jobs").update({
          status: "completed",
          output_video_url: finalUrl,
          progress: 100,
          current_step: "Video ready!",
        }).eq("id", jobId);

        // Create module_output record
        await adminClient.from("module_outputs").upsert({
          module_id: job.module_id,
          format_type: "generated_video",
          content: { jobId, renderId, sceneCount: job.scene_total },
          video_url: finalUrl,
          status: "completed",
          provider_name: "shotstack",
        }, { onConflict: "module_id,format_type" }).select();

        // If upsert by onConflict doesn't work (no unique constraint), just insert
        // Fallback: insert if no existing record
        const { data: existing } = await adminClient
          .from("module_outputs")
          .select("id")
          .eq("module_id", job.module_id)
          .eq("format_type", "generated_video")
          .maybeSingle();

        if (!existing) {
          await adminClient.from("module_outputs").insert({
            module_id: job.module_id,
            format_type: "generated_video",
            content: { jobId, renderId, sceneCount: job.scene_total },
            video_url: finalUrl,
            status: "completed",
            provider_name: "shotstack",
          });
        } else {
          await adminClient.from("module_outputs").update({
            video_url: finalUrl,
            status: "completed",
            content: { jobId, renderId, sceneCount: job.scene_total },
          }).eq("id", existing.id);
        }

        return new Response(JSON.stringify({
          status: "completed",
          outputVideoUrl: finalUrl,
          progress: 100,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (renderStatus === "failed") {
      const errorMsg = statusData.response?.error || "Shotstack render failed";
      await adminClient.from("video_generation_jobs").update({
        status: "failed",
        error_message: errorMsg,
      }).eq("id", jobId);

      return new Response(JSON.stringify({
        status: "failed",
        errorMessage: errorMsg,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Still rendering
    return new Response(JSON.stringify({
      status: "rendering",
      currentStep: `Rendering video (${renderStatus})...`,
      progress: 92,
      sceneCompleted: job.scene_completed,
      sceneTotal: job.scene_total,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Check render error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
