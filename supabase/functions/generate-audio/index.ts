import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateAudioRequest {
  text: string;
  slideIndex: number;
  voice?: string;
  moduleId?: string;
  narrationProvider?: string;
}

// ─── Provider-specific generation functions ────────────────────────────

async function generateWithElevenLabs(
  text: string,
  voiceId: string,
  apiKey: string,
  modelId: string
): Promise<{ buffer: ArrayBuffer; error?: never } | { buffer?: never; error: string; code: string; status: number }> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text.slice(0, 5000),
        model_id: modelId || 'eleven_multilingual_v2',
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
    const errorText = await response.text();
    console.error('ElevenLabs API error:', response.status, errorText);
    
    let errorMessage = 'Failed to generate audio';
    let errorCode = 'GENERATION_FAILED';
    
    if (response.status === 401) {
      if (errorText.includes('quota_exceeded')) {
        errorMessage = 'ElevenLabs character quota exceeded.';
        errorCode = 'CREDITS_EXHAUSTED';
      } else if (errorText.includes('detected_unusual_activity')) {
        errorMessage = 'ElevenLabs Free Tier disabled due to unusual activity.';
        errorCode = 'FREE_TIER_BLOCKED';
      } else {
        errorMessage = 'Invalid ElevenLabs API key.';
        errorCode = 'API_KEY_INVALID';
      }
    } else if (response.status === 429) {
      errorMessage = 'Rate limit exceeded.';
      errorCode = 'RATE_LIMITED';
    } else if (response.status === 402) {
      errorMessage = 'ElevenLabs credits exhausted.';
      errorCode = 'CREDITS_EXHAUSTED';
    }

    return { error: errorMessage, code: errorCode, status: response.status };
  }

  return { buffer: await response.arrayBuffer() };
}

async function generateWithGoogleTTS(
  text: string,
  voiceName: string,
  apiKey: string
): Promise<{ buffer: ArrayBuffer; error?: never } | { buffer?: never; error: string; code: string; status: number }> {
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: text.slice(0, 5000) },
        voice: {
          languageCode: 'en-US',
          name: voiceName || 'en-US-Neural2-D',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 0.95,
          pitch: 0,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google TTS API error:', response.status, errorText);
    
    let errorMessage = 'Failed to generate audio with Google TTS';
    let errorCode = 'GENERATION_FAILED';
    
    if (response.status === 401 || response.status === 403) {
      errorMessage = 'Invalid Google Cloud API key or TTS API not enabled.';
      errorCode = 'API_KEY_INVALID';
    } else if (response.status === 429) {
      errorMessage = 'Google TTS rate limit exceeded.';
      errorCode = 'RATE_LIMITED';
    }

    return { error: errorMessage, code: errorCode, status: response.status };
  }

  const data = await response.json();
  // Google returns base64-encoded audio in audioContent
  const binaryString = atob(data.audioContent);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return { buffer: bytes.buffer };
}

async function generateWithOpenAITTS(
  text: string,
  model: string,
  voice: string,
  apiKey: string
): Promise<{ buffer: ArrayBuffer; error?: never } | { buffer?: never; error: string; code: string; status: number }> {
  const response = await fetch(
    'https://api.openai.com/v1/audio/speech',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'tts-1',
        input: text.slice(0, 4096),
        voice: voice || 'nova',
        response_format: 'mp3',
        speed: 0.95,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI TTS API error:', response.status, errorText);
    
    let errorMessage = 'Failed to generate audio with OpenAI TTS';
    let errorCode = 'GENERATION_FAILED';
    
    if (response.status === 401) {
      errorMessage = 'Invalid OpenAI API key.';
      errorCode = 'API_KEY_INVALID';
    } else if (response.status === 429) {
      errorMessage = 'OpenAI TTS rate limit exceeded.';
      errorCode = 'RATE_LIMITED';
    } else if (response.status === 402) {
      errorMessage = 'OpenAI credits exhausted.';
      errorCode = 'CREDITS_EXHAUSTED';
    }

    return { error: errorMessage, code: errorCode, status: response.status };
  }

  return { buffer: await response.arrayBuffer() };
}

async function generateWithAI4Bharat(
  text: string,
  voiceDescription: string,
  _apiKey: string
): Promise<{ buffer: ArrayBuffer; contentType: string; error?: never } | { buffer?: never; contentType?: never; error: string; code: string; status: number }> {
  // Self-hosted Dockerized AI4Bharat Indic Parler-TTS microservice.
  // Configure TTS_SERVICE_URL and TTS_SHARED_SECRET in Lovable Cloud secrets.
  const serviceUrl = Deno.env.get('TTS_SERVICE_URL');
  const sharedSecret = Deno.env.get('TTS_SHARED_SECRET');

  if (!serviceUrl || !sharedSecret) {
    return {
      error: 'Self-hosted AI4Bharat TTS service is not configured. Set TTS_SERVICE_URL and TTS_SHARED_SECRET.',
      code: 'TTS_SERVICE_NOT_CONFIGURED',
      status: 500,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(`${serviceUrl.replace(/\/$/, '')}/generate-voice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'audio/wav',
        'x-api-key': sharedSecret,
      },
      body: JSON.stringify({
        text: text.slice(0, 4000),
        language: 'en',
        style: 'narration',
        voice_description: voiceDescription ||
          'A clear female Indian English speaker with a neutral pace and natural intonation, recorded in a quiet studio.',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Self-hosted AI4Bharat error:', response.status, errorText);
      return {
        error: `AI4Bharat TTS service error (${response.status}): ${errorText.slice(0, 300)}`,
        code: response.status === 401 ? 'TTS_SERVICE_AUTH' : 'GENERATION_FAILED',
        status: response.status,
      };
    }

    const contentType = response.headers.get('content-type') || 'audio/wav';
    return { buffer: await response.arrayBuffer(), contentType };
  } catch (err) {
    console.error('Self-hosted AI4Bharat fetch failed:', err);
    return {
      error: err instanceof Error ? err.message : 'TTS service unreachable',
      code: 'TTS_SERVICE_UNREACHABLE',
      status: 502,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Helper: get API key from vault or env ─────────────────────────────

async function getApiKey(
  adminClient: any,
  provider: string,
  envFallback: string
): Promise<string | null> {
  // Try api_key_vault first
  const { data } = await adminClient
    .from('api_key_vault')
    .select('api_key_encrypted')
    .eq('provider', provider)
    .maybeSingle();

  if (data?.api_key_encrypted) return data.api_key_encrypted;

  // Fallback to env
  return Deno.env.get(envFallback) || null;
}

// ─── Main handler ──────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // AUTHENTICATION
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid authorization header', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    console.log(`Authenticated user ${userId} generating audio`);

    const { text, slideIndex, voice, moduleId, narrationProvider: requestedProvider } = await req.json() as GenerateAudioRequest;

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required for audio generation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // ─── Determine which provider to use ───────────────────────────
    let activeProvider = 'elevenlabs';
    let activeModel: string | null = null;

    if (requestedProvider) {
      activeProvider = requestedProvider;
    } else {
      // Read from system_ai_settings
      const { data: aiSettings } = await adminClient
        .from('system_ai_settings')
        .select('narration_ai_mode, narration_ai_provider, narration_ai_model')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();

      if (aiSettings) {
        const mode = (aiSettings as any).narration_ai_mode || 'lovable';
        if (mode === 'own') {
          activeProvider = (aiSettings as any).narration_ai_provider || 'elevenlabs';
          activeModel = (aiSettings as any).narration_ai_model || null;
        }
        // If mode is 'lovable', default to elevenlabs with env key
      }
    }

    console.log(`Using narration provider: ${activeProvider}, model: ${activeModel}, slide: ${slideIndex}`);

    // ─── Generate audio based on provider ──────────────────────────
    let audioResult:
      | { buffer: ArrayBuffer; contentType?: string; error?: never }
      | { buffer?: never; contentType?: never; error: string; code: string; status: number };

    switch (activeProvider) {
      case 'elevenlabs': {
        const apiKey = await getApiKey(adminClient, 'elevenlabs', 'ELEVENLABS_API_KEY');
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: 'ElevenLabs API key not configured.', code: 'API_KEY_MISSING' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const voiceId = voice || 'EXAVITQu4vr4xnSDxMaL';
        audioResult = await generateWithElevenLabs(text, voiceId, apiKey, activeModel || 'eleven_multilingual_v2');
        break;
      }

      case 'google_tts': {
        const apiKey = await getApiKey(adminClient, 'google_tts', 'GOOGLE_TTS_API_KEY');
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: 'Google Cloud TTS API key not configured.', code: 'API_KEY_MISSING' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        audioResult = await generateWithGoogleTTS(text, activeModel || 'en-US-Neural2-D', apiKey);
        break;
      }

      case 'openai_tts': {
        const apiKey = await getApiKey(adminClient, 'openai_tts', 'OPENAI_API_KEY');
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: 'OpenAI API key not configured.', code: 'API_KEY_MISSING' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const openaiVoice = voice || 'nova';
        audioResult = await generateWithOpenAITTS(text, activeModel || 'tts-1', openaiVoice, apiKey);
        break;
      }

      case 'ai4bharat': {
        const apiKey = await getApiKey(adminClient, 'ai4bharat', 'HF_API_TOKEN');
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: 'Hugging Face token (HF_API_TOKEN) not configured for AI4Bharat.', code: 'API_KEY_MISSING' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // For AI4Bharat the `voice` field carries a Parler-TTS voice description prompt.
        audioResult = await generateWithAI4Bharat(text, voice || '', apiKey);
        break;
      }

      default: {
        return new Response(
          JSON.stringify({ error: `Unknown narration provider: ${activeProvider}`, code: 'INVALID_PROVIDER' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle provider errors
    if ('error' in audioResult && audioResult.error) {
      return new Response(
        JSON.stringify({ error: audioResult.error, code: audioResult.code }),
        { status: audioResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const arrayBuffer = audioResult.buffer!;
    const estimatedDuration = Math.ceil(text.length / 15);

    // If moduleId provided, upload to storage and return URL
    if (moduleId) {
      const isWav = (audioResult.contentType || '').includes('wav');
      const ext = isWav ? 'wav' : 'mp3';
      const contentType = isWav ? 'audio/wav' : 'audio/mpeg';
      const fileName = `module-audio/${moduleId}/slide-${slideIndex}.${ext}`;
      const uint8 = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await adminClient.storage
        .from('module-files')
        .upload(fileName, uint8, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return new Response(
          JSON.stringify({ error: 'Failed to upload audio file', code: 'UPLOAD_FAILED' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: urlData } = adminClient.storage
        .from('module-files')
        .getPublicUrl(fileName);

      const audioUrl = urlData.publicUrl;
      console.log(`Audio uploaded for slide ${slideIndex}: ${audioUrl}`);

      // Update module_slide_audio record
      const voiceId = voice || (activeProvider === 'elevenlabs' ? 'EXAVITQu4vr4xnSDxMaL' : activeProvider);
      await adminClient.from('module_slide_audio').upsert({
        module_id: moduleId,
        slide_number: slideIndex,
        narration_text: text.slice(0, 10000),
        audio_url: audioUrl,
        audio_duration: estimatedDuration,
        audio_status: 'completed',
        voice_id: voiceId,
      }, { onConflict: 'module_id,slide_number' });

      return new Response(
        JSON.stringify({
          audioUrl,
          slideIndex,
          duration: estimatedDuration,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Legacy: return base64 if no moduleId
    const base64Audio = base64Encode(arrayBuffer);

    console.log(`Audio generated successfully for slide ${slideIndex}`);

    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        slideIndex,
        duration: estimatedDuration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-audio function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
