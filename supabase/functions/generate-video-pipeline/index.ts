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
    // AUTH
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

    // RBAC check
    const allowedRoles = ["sme", "sme_expert", "manager", "admin"] as const;
    let hasAccess = false;
    for (const role of allowedRoles) {
      const { data } = await adminClient.rpc("has_role", { _user_id: authData.user.id, _role: role });
      if (data) { hasAccess = true; break; }
    }
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { moduleId, voiceId } = await req.json();
    if (!moduleId) {
      return new Response(JSON.stringify({ error: "moduleId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load module
    const { data: mod, error: modError } = await adminClient
      .from("modules")
      .select("slides, title, module_type")
      .eq("id", moduleId)
      .single();

    if (modError || !mod) {
      return new Response(JSON.stringify({ error: "Module not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const slides = mod.slides as any;
    const scenes = slides?.scenes;
    const videoAspectRatio = slides?.aspectRatio || "9:16";
    if (!Array.isArray(scenes) || scenes.length === 0) {
      return new Response(JSON.stringify({ error: "No scenes found in module" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create job
    const { data: job, error: jobError } = await adminClient
      .from("video_generation_jobs")
      .insert({
        module_id: moduleId,
        status: "processing",
        scene_total: scenes.length,
        scene_completed: 0,
        current_step: "Starting scene generation...",
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error("Failed to create job:", jobError);
      return new Response(JSON.stringify({ error: "Failed to create job" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jobId = job.id;
    const voice = voiceId || "EXAVITQu4vr4xnSDxMaL";
    const RUNWAY_API_KEY = Deno.env.get("RUNWAY_API_KEY");
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const SHOTSTACK_API_KEY = Deno.env.get("SHOTSTACK_API_KEY");

    if (!RUNWAY_API_KEY || !ELEVENLABS_API_KEY || !SHOTSTACK_API_KEY) {
      await adminClient.from("video_generation_jobs").update({
        status: "failed",
        error_message: "Missing API keys. Ensure RUNWAY_API_KEY, ELEVENLABS_API_KEY, and SHOTSTACK_API_KEY are configured.",
      }).eq("id", jobId);
      return new Response(JSON.stringify({ error: "Missing API keys", jobId }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process scenes sequentially
    const sceneAssets: { videoUrl: string; audioUrl: string; duration: number }[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const sceneNum = scene.sceneNumber || i + 1;
      const duration = scene.duration || 4;

      await adminClient.from("video_generation_jobs").update({
        current_step: `Generating scene ${sceneNum} of ${scenes.length}...`,
        scene_completed: i,
        progress: Math.round((i / scenes.length) * 80),
      }).eq("id", jobId);

      // Step 1: Generate video clip via Runway
      let videoClipUrl = "";
      const videoPrompt = scene.videoPrompt || scene.visualDescription || scene.sceneTitle;

      try {
        videoClipUrl = await generateRunwayClip(RUNWAY_API_KEY, videoPrompt, duration, videoAspectRatio);
      } catch (err) {
        console.error(`Runway failed for scene ${sceneNum}, retrying...`, err);
        try {
          videoClipUrl = await generateRunwayClip(RUNWAY_API_KEY, videoPrompt, duration, videoAspectRatio);
        } catch (retryErr) {
          console.error(`Runway retry failed for scene ${sceneNum}:`, retryErr);
          await adminClient.from("video_generation_jobs").update({
            status: "failed",
            error_message: `Video generation failed for scene ${sceneNum}: ${retryErr instanceof Error ? retryErr.message : "Unknown error"}`,
            scene_completed: i,
          }).eq("id", jobId);
          return new Response(JSON.stringify({ error: `Scene ${sceneNum} video generation failed`, jobId }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Upload video clip to storage
      const videoFileName = `video-gen/${moduleId}/scene-${sceneNum}-video.mp4`;
      const videoBuffer = await fetch(videoClipUrl).then(r => r.arrayBuffer());
      await adminClient.storage.from("module-files").upload(videoFileName, new Uint8Array(videoBuffer), {
        contentType: "video/mp4", upsert: true,
      });
      const { data: videoUrlData } = adminClient.storage.from("module-files").getPublicUrl(videoFileName);

      // Step 2: Generate narration audio via ElevenLabs
      let audioPublicUrl = "";
      const narration = scene.narration || "";

      if (narration.trim()) {
        try {
          audioPublicUrl = await generateElevenLabsAudio(ELEVENLABS_API_KEY, narration, voice, adminClient, moduleId, sceneNum);
        } catch (err) {
          console.error(`ElevenLabs failed for scene ${sceneNum}, retrying...`, err);
          try {
            audioPublicUrl = await generateElevenLabsAudio(ELEVENLABS_API_KEY, narration, voice, adminClient, moduleId, sceneNum);
          } catch (retryErr) {
            console.error(`ElevenLabs retry failed for scene ${sceneNum}:`, retryErr);
            await adminClient.from("video_generation_jobs").update({
              status: "failed",
              error_message: `Audio generation failed for scene ${sceneNum}: ${retryErr instanceof Error ? retryErr.message : "Unknown error"}`,
              scene_completed: i,
            }).eq("id", jobId);
            return new Response(JSON.stringify({ error: `Scene ${sceneNum} audio generation failed`, jobId }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      sceneAssets.push({
        videoUrl: videoUrlData.publicUrl,
        audioUrl: audioPublicUrl,
        duration,
      });
    }

    // Step 3: Build Shotstack timeline
    await adminClient.from("video_generation_jobs").update({
      current_step: "Building timeline and rendering final video...",
      scene_completed: scenes.length,
      progress: 85,
    }).eq("id", jobId);

    const aspectRatio = slides.aspectRatio || "9:16";
    const timeline = buildShotstackTimeline(sceneAssets, aspectRatio);

    // Step 4: Submit to Shotstack render API
    try {
      const renderResponse = await fetch("https://api.shotstack.io/edit/stage/render", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": SHOTSTACK_API_KEY,
        },
        body: JSON.stringify(timeline),
      });

      if (!renderResponse.ok) {
        const errText = await renderResponse.text();
        throw new Error(`Shotstack render failed [${renderResponse.status}]: ${errText}`);
      }

      const renderData = await renderResponse.json();
      const renderId = renderData.response?.id;

      if (!renderId) {
        throw new Error("No render ID returned from Shotstack");
      }

      await adminClient.from("video_generation_jobs").update({
        shotstack_render_id: renderId,
        current_step: "Rendering final video...",
        progress: 90,
      }).eq("id", jobId);

      return new Response(JSON.stringify({ jobId, renderId, status: "rendering" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Shotstack render error:", err);
      await adminClient.from("video_generation_jobs").update({
        status: "failed",
        error_message: `Render failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      }).eq("id", jobId);
      return new Response(JSON.stringify({ error: "Render submission failed", jobId }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Pipeline error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// --- Runway Gen-4.5 / Veo ---
async function generateRunwayClip(
  apiKey: string,
  prompt: string,
  durationSec: number,
  aspectRatio: string
): Promise<string> {
  const runwayDuration = durationSec <= 5 ? 5 : 10;
  // Runway expects ratio as "16:9" or "9:16", NOT resolution strings
  const runwayRatio = aspectRatio === "9:16" ? "9:16" : "16:9";

  const requestBody = {
    model: "gen4.5",
    promptText: prompt.slice(0, 500),
    duration: runwayDuration,
    ratio: runwayRatio,
  };

  console.log("Runway request payload:", JSON.stringify(requestBody));

  const createRes = await fetch("https://api.dev.runwayml.com/v1/text_to_video", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Runway-Version": "2024-11-06",
    },
    body: JSON.stringify(requestBody),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Runway create task failed [${createRes.status}]: ${errText}`);
  }

  const taskData = await createRes.json();
  const taskId = taskData.id;
  if (!taskId) throw new Error("No task ID from Runway");

  // Poll for completion (max 5 min)
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise(r => setTimeout(r, 5000));

    const statusRes = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "X-Runway-Version": "2024-11-06",
      },
    });

    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();
    if (statusData.status === "SUCCEEDED" && statusData.output?.[0]) {
      return statusData.output[0];
    }
    if (statusData.status === "FAILED") {
      throw new Error(`Runway task failed: ${statusData.failure || "Unknown"}`);
    }
  }
  throw new Error("Runway task timed out after 5 minutes");
}

// --- ElevenLabs TTS ---
async function generateElevenLabsAudio(
  apiKey: string,
  text: string,
  voiceId: string,
  adminClient: any,
  moduleId: string,
  sceneNum: number
): Promise<string> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text.slice(0, 5000),
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
          speed: 0.9,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs failed [${response.status}]: ${errText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const fileName = `video-gen/${moduleId}/scene-${sceneNum}-audio.mp3`;

  await adminClient.storage.from("module-files").upload(fileName, new Uint8Array(audioBuffer), {
    contentType: "audio/mpeg", upsert: true,
  });

  const { data: urlData } = adminClient.storage.from("module-files").getPublicUrl(fileName);
  return urlData.publicUrl;
}

// --- Shotstack Timeline Builder ---
function buildShotstackTimeline(
  assets: { videoUrl: string; audioUrl: string; duration: number }[],
  aspectRatio: string
) {
  let startTime = 0;
  const videoClips: any[] = [];
  const audioClips: any[] = [];

  for (const asset of assets) {
    videoClips.push({
      asset: { type: "video", src: asset.videoUrl },
      start: startTime,
      length: asset.duration,
      transition: { in: "fade", out: "fade" },
    });

    if (asset.audioUrl) {
      audioClips.push({
        asset: { type: "audio", src: asset.audioUrl },
        start: startTime,
        length: asset.duration,
      });
    }

    startTime += asset.duration;
  }

  const tracks: any[] = [{ clips: videoClips }];
  if (audioClips.length > 0) {
    tracks.push({ clips: audioClips });
  }

  // Map aspect ratio
  const resolution = aspectRatio === "16:9" ? "hd" : "mobile";

  return {
    timeline: { tracks },
    output: {
      format: "mp4",
      resolution,
      aspectRatio: aspectRatio === "16:9" ? "16:9" : "9:16",
    },
  };
}
