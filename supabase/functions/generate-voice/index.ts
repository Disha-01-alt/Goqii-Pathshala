import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoiceRequest {
  text: string;
  language?: string;
  style?: 'narration' | 'conversational' | 'energetic';
  voice_description?: string;
}

const VALID_STYLES = new Set(['narration', 'conversational', 'energetic']);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ─────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userId = claimsData.claims.sub;

    // ── Validate input ───────────────────────────────────────────
    const body = (await req.json()) as VoiceRequest;
    const text = (body.text || '').trim();
    const style = body.style || 'narration';

    if (!text || text.length < 1 || text.length > 4000) {
      return new Response(
        JSON.stringify({ error: 'text must be 1-4000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!VALID_STYLES.has(style)) {
      return new Response(
        JSON.stringify({ error: 'style must be narration | conversational | energetic' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Forward to self-hosted Docker service ───────────────────
    const serviceUrl = Deno.env.get('TTS_SERVICE_URL');
    const sharedSecret = Deno.env.get('TTS_SHARED_SECRET');
    if (!serviceUrl || !sharedSecret) {
      return new Response(
        JSON.stringify({ error: 'TTS service not configured (TTS_SERVICE_URL / TTS_SHARED_SECRET missing)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    let ttsRes: Response;
    try {
      ttsRes = await fetch(`${serviceUrl.replace(/\/$/, '')}/generate-voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'audio/wav',
          'x-api-key': sharedSecret,
        },
        body: JSON.stringify({
          text,
          language: body.language || 'en',
          style,
          voice_description: body.voice_description,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      console.error('TTS service error', ttsRes.status, errText);
      return new Response(
        JSON.stringify({ error: `TTS service error (${ttsRes.status}): ${errText.slice(0, 300)}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wavBuffer = await ttsRes.arrayBuffer();
    const durationMs = Date.now() - started;

    // ── Upload to module-files/voice/<userId>/<uuid>.wav ────────
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const fileId = crypto.randomUUID();
    const path = `voice/${userId}/${fileId}.wav`;
    const { error: uploadErr } = await admin.storage
      .from('module-files')
      .upload(path, new Uint8Array(wavBuffer), {
        contentType: 'audio/wav',
        upsert: false,
      });

    if (uploadErr) {
      console.error('Upload failed:', uploadErr);
      return new Response(
        JSON.stringify({ error: 'Failed to store audio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: urlData } = admin.storage.from('module-files').getPublicUrl(path);

    return new Response(
      JSON.stringify({ url: urlData.publicUrl, durationMs, bytes: wavBuffer.byteLength }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('generate-voice error', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
