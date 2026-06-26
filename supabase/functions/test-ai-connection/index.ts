import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestConnectionRequest {
  provider: string;
  apiKey: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // AUTHENTICATION: Verify the user is authenticated and has admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, message: 'Unauthorized: Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    
    if (userError || !userData?.user) {
      console.error('Auth verification failed:', userError);
      return new Response(
        JSON.stringify({ success: false, message: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    // Check if user has admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: isAdmin, error: roleError } = await adminClient.rpc('has_role', {
      _user_id: userId,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('Role check failed:', roleError);
      return new Response(
        JSON.stringify({ success: false, message: 'Forbidden: Only admins can test AI connections' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${userId} testing AI connection`);

    const { provider, apiKey } = await req.json() as TestConnectionRequest;

    if (!provider || !apiKey) {
      return new Response(
        JSON.stringify({ success: false, message: 'Provider and API key are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Testing connection for provider: ${provider}`);

    let success = false;
    let message = '';

    switch (provider) {
      case 'openai': {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        
        if (response.ok) {
          success = true;
          message = 'OpenAI connected successfully!';
        } else if (response.status === 401) {
          message = 'Invalid API key. Please check your OpenAI API key.';
        } else if (response.status === 429) {
          message = 'Rate limit exceeded. Your API key is valid but rate limited.';
        } else {
          const error = await response.text();
          message = `OpenAI error: ${error}`;
        }
        break;
      }

      case 'google': {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
        );
        
        if (response.ok) {
          success = true;
          message = 'Google AI connected successfully!';
        } else if (response.status === 400 || response.status === 401) {
          message = 'Invalid API key. Please check your Google AI API key.';
        } else {
          const error = await response.text();
          message = `Google AI error: ${error}`;
        }
        break;
      }

      case 'perplexity': {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 5,
          }),
        });
        
        if (response.ok) {
          success = true;
          message = 'Perplexity connected successfully!';
        } else if (response.status === 401) {
          message = 'Invalid API key. Please check your Perplexity API key.';
        } else if (response.status === 429) {
          message = 'Rate limit exceeded. Your API key is valid but rate limited.';
        } else {
          const error = await response.text();
          message = `Perplexity error: ${error}`;
        }
        break;
      }

      // ─── Narration AI providers ──────────────────────────────
      case 'elevenlabs': {
        const response = await fetch('https://api.elevenlabs.io/v1/user', {
          headers: { 'xi-api-key': apiKey },
        });

        if (response.ok) {
          success = true;
          message = 'ElevenLabs connected successfully!';
        } else if (response.status === 401) {
          message = 'Invalid API key. Please check your ElevenLabs API key.';
        } else {
          const error = await response.text();
          message = `ElevenLabs error: ${error}`;
        }
        break;
      }

      case 'google_tts': {
        // Test by listing available voices
        const response = await fetch(
          `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`
        );

        if (response.ok) {
          success = true;
          message = 'Google Cloud TTS connected successfully!';
        } else if (response.status === 401 || response.status === 403) {
          message = 'Invalid API key or TTS API not enabled. Enable "Cloud Text-to-Speech API" in Google Cloud Console.';
        } else {
          const error = await response.text();
          message = `Google TTS error: ${error}`;
        }
        break;
      }

      case 'openai_tts': {
        // Use the same OpenAI models endpoint to verify
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });

        if (response.ok) {
          success = true;
          message = 'OpenAI TTS connected successfully!';
        } else if (response.status === 401) {
          message = 'Invalid API key. Please check your OpenAI API key.';
        } else if (response.status === 429) {
          message = 'Rate limit exceeded. Your API key is valid but rate limited.';
        } else {
          const error = await response.text();
          message = `OpenAI TTS error: ${error}`;
        }
        break;
      }

      default:
        message = `Unknown provider: ${provider}`;
    }

    console.log(`Test result for ${provider}: success=${success}, message=${message}`);

    return new Response(
      JSON.stringify({ success, message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error testing connection:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection test failed' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
