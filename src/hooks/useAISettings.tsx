import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';

export type AIProvider = 'google' | 'openai' | 'perplexity';
export type QuizAIProvider = 'mistral' | 'openai' | 'anthropic';
export type NarrationAIProvider = 'elevenlabs' | 'google_tts' | 'openai_tts';

export interface AISettings {
  // Content & Image AI (unified)
  aiMode: 'lovable' | 'own';
  provider: AIProvider;
  model: string | null;
  // Quiz AI (separate)
  quizAiMode: 'lovable' | 'own';
  quizAiProvider: QuizAIProvider;
  quizAiModel: string | null;
  // Narration AI (separate)
  narrationAiMode: 'lovable' | 'own';
  narrationAiProvider: NarrationAIProvider;
  narrationAiModel: string | null;
}

interface UseAISettingsReturn {
  settings: AISettings | null;
  loading: boolean;
  error: Error | null;
  saveSettings: (settings: Partial<AISettings>) => Promise<void>;
  refetch: () => void;
  testConnection: (provider: AIProvider | QuizAIProvider | NarrationAIProvider, apiKey: string) => Promise<{ success: boolean; message: string }>;
  getContentImageAISettings: () => { aiMode: string; provider: string; model: string | null };
  getQuizAISettings: () => { aiMode: string; provider: string; model: string | null };
  getNarrationAISettings: () => { aiMode: string; provider: string; model: string | null };
  isAdmin: boolean;
}

// Available models per provider (Content & Image AI)
export const providerModels: Record<AIProvider, { id: string; name: string }[]> = {
  google: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  ],
  perplexity: [
    { id: 'sonar', name: 'Sonar' },
    { id: 'sonar-pro', name: 'Sonar Pro' },
  ],
};

// Available models for Quiz AI
export const quizProviderModels: Record<QuizAIProvider, { id: string; name: string }[]> = {
  mistral: [
    { id: 'mistral-large-latest', name: 'Mistral Large' },
    { id: 'mistral-small-latest', name: 'Mistral Small' },
  ],
  openai: [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
  ],
};

// Available models for Narration AI
export const narrationProviderModels: Record<NarrationAIProvider, { id: string; name: string }[]> = {
  elevenlabs: [
    { id: 'eleven_multilingual_v2', name: 'Multilingual v2 (Best Quality)' },
    { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5 (Low Latency)' },
  ],
  google_tts: [
    { id: 'en-US-Neural2-D', name: 'Neural2 Male (D)' },
    { id: 'en-US-Neural2-F', name: 'Neural2 Female (F)' },
    { id: 'en-US-Studio-M', name: 'Studio Male (M)' },
    { id: 'en-US-Studio-O', name: 'Studio Female (O)' },
  ],
  openai_tts: [
    { id: 'tts-1', name: 'TTS-1 (Standard)' },
    { id: 'tts-1-hd', name: 'TTS-1 HD (High Quality)' },
  ],
};

// Voice options for OpenAI TTS (separate from model)
export const openaiTTSVoices = [
  { id: 'alloy', name: 'Alloy' },
  { id: 'echo', name: 'Echo' },
  { id: 'fable', name: 'Fable' },
  { id: 'nova', name: 'Nova' },
  { id: 'onyx', name: 'Onyx' },
  { id: 'shimmer', name: 'Shimmer' },
];

export const providers: { id: AIProvider; name: string; description: string; docsUrl: string }[] = [
  { id: 'google', name: 'Google AI', description: 'Gemini models', docsUrl: 'https://aistudio.google.com/apikey' },
  { id: 'openai', name: 'OpenAI', description: 'GPT models', docsUrl: 'https://platform.openai.com/api-keys' },
  { id: 'perplexity', name: 'Perplexity', description: 'Sonar models', docsUrl: 'https://www.perplexity.ai/settings/api' },
];

export const quizProviders: { id: QuizAIProvider; name: string; description: string; docsUrl: string }[] = [
  { id: 'mistral', name: 'Mistral AI', description: 'Mistral models', docsUrl: 'https://console.mistral.ai/api-keys/' },
  { id: 'openai', name: 'OpenAI', description: 'GPT models', docsUrl: 'https://platform.openai.com/api-keys' },
  { id: 'anthropic', name: 'Claude (Anthropic)', description: 'Claude models', docsUrl: 'https://console.anthropic.com/settings/keys' },
];

export const narrationProviders: { id: NarrationAIProvider; name: string; description: string; docsUrl: string }[] = [
  { id: 'elevenlabs', name: 'ElevenLabs', description: 'Premium voices, highest quality', docsUrl: 'https://elevenlabs.io/app/settings/api-keys' },
  { id: 'google_tts', name: 'Google Cloud TTS', description: 'Neural2 & Studio voices, cheapest', docsUrl: 'https://cloud.google.com/text-to-speech/docs/before-you-begin' },
  { id: 'openai_tts', name: 'OpenAI TTS', description: 'TTS-1 voices, balanced cost', docsUrl: 'https://platform.openai.com/api-keys' },
];

export function useAISettings(): UseAISettingsReturn {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isAdmin = role === 'admin';

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('system_ai_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setSettings({
          aiMode: (data.ai_mode as 'lovable' | 'own') || 'lovable',
          provider: (data.provider as AIProvider) || 'google',
          model: data.model || null,
          quizAiMode: ((data as any).quiz_ai_mode as 'lovable' | 'own') || 'lovable',
          quizAiProvider: ((data as any).quiz_ai_provider as QuizAIProvider) || 'mistral',
          quizAiModel: (data as any).quiz_ai_model || null,
          narrationAiMode: ((data as any).narration_ai_mode as 'lovable' | 'own') || 'lovable',
          narrationAiProvider: ((data as any).narration_ai_provider as NarrationAIProvider) || 'elevenlabs',
          narrationAiModel: (data as any).narration_ai_model || null,
        });
      } else {
        setSettings({
          aiMode: 'lovable',
          provider: 'google',
          model: null,
          quizAiMode: 'lovable',
          quizAiProvider: 'mistral',
          quizAiModel: null,
          narrationAiMode: 'lovable',
          narrationAiProvider: 'elevenlabs',
          narrationAiModel: null,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch settings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (newSettings: Partial<AISettings>) => {
    if (!user) throw new Error('User not authenticated');
    if (!isAdmin) throw new Error('Only admins can modify AI settings');

    const updatedSettings = { ...settings, ...newSettings };

    const { error: upsertError } = await supabase
      .from('system_ai_settings')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        ai_mode: updatedSettings.aiMode,
        provider: updatedSettings.provider,
        model: updatedSettings.model,
        quiz_ai_mode: updatedSettings.quizAiMode,
        quiz_ai_provider: updatedSettings.quizAiProvider,
        quiz_ai_model: updatedSettings.quizAiModel,
        narration_ai_mode: updatedSettings.narrationAiMode,
        narration_ai_provider: updatedSettings.narrationAiProvider,
        narration_ai_model: updatedSettings.narrationAiModel,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      } as any, {
        onConflict: 'id',
      });

    if (upsertError) throw upsertError;

    setSettings(updatedSettings as AISettings);
  };

  const testConnection = async (
    provider: AIProvider | QuizAIProvider | NarrationAIProvider, 
    apiKey: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('test-ai-connection', {
        body: { provider, apiKey },
      });

      if (error) throw error;

      return {
        success: data?.success ?? false,
        message: data?.message ?? 'Unknown result',
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed',
      };
    }
  };

  const getContentImageAISettings = useCallback(() => {
    const aiMode = settings?.aiMode ?? 'lovable';
    const provider = settings?.provider ?? 'google';
    const model = settings?.model ?? null;
    return { aiMode, provider, model };
  }, [settings]);

  const getQuizAISettings = useCallback(() => {
    const aiMode = settings?.quizAiMode ?? 'lovable';
    const provider = settings?.quizAiProvider ?? 'mistral';
    const model = settings?.quizAiModel ?? null;
    return { aiMode, provider, model };
  }, [settings]);

  const getNarrationAISettings = useCallback(() => {
    const aiMode = settings?.narrationAiMode ?? 'lovable';
    const provider = settings?.narrationAiProvider ?? 'elevenlabs';
    const model = settings?.narrationAiModel ?? null;
    return { aiMode, provider, model };
  }, [settings]);

  return {
    settings,
    loading,
    error,
    saveSettings,
    refetch: fetchSettings,
    testConnection,
    getContentImageAISettings,
    getQuizAISettings,
    getNarrationAISettings,
    isAdmin,
  };
}
