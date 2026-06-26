import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CustomAIProvider {
  id: string;
  user_id: string;
  name: string;
  provider_key: string;
  api_endpoint: string;
  api_key_header: string;
  api_key_prefix: string;
  ai_type: 'content' | 'quiz' | 'both';
  models: { id: string; name: string }[];
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomProviderInput {
  name: string;
  providerKey: string;
  apiEndpoint: string;
  apiKeyHeader?: string;
  apiKeyPrefix?: string;
  aiType: 'content' | 'quiz' | 'both';
  models: { id: string; name: string }[];
  description?: string;
}

export interface UpdateCustomProviderInput extends Partial<CreateCustomProviderInput> {
  isActive?: boolean;
}

export function useCustomAIProviders() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<CustomAIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProviders = useCallback(async () => {
    if (!user) {
      setProviders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from('custom_ai_providers')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      // Parse JSON models field
      const parsedProviders = (data || []).map((p: Record<string, unknown>) => ({
        ...p,
        models: Array.isArray(p.models) ? p.models : JSON.parse(String(p.models || '[]')),
      })) as CustomAIProvider[];

      setProviders(parsedProviders);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch custom providers'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const createProvider = useCallback(async (input: CreateCustomProviderInput) => {
    if (!user) throw new Error('User not authenticated');

    const insertData = {
      user_id: user.id,
      name: input.name,
      provider_key: input.providerKey,
      api_endpoint: input.apiEndpoint,
      api_key_header: input.apiKeyHeader || 'Authorization',
      api_key_prefix: input.apiKeyPrefix || 'Bearer ',
      ai_type: input.aiType,
      models: input.models,
      description: input.description || null,
    };

    const { data, error: insertError } = await supabase
      .from('custom_ai_providers')
      .insert(insertData as any)
      .select()
      .single();

    if (insertError) throw insertError;

    await fetchProviders();
    return data as unknown as CustomAIProvider;
  }, [user, fetchProviders]);

  const updateProvider = useCallback(async (id: string, input: UpdateCustomProviderInput) => {
    if (!user) throw new Error('User not authenticated');

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.providerKey !== undefined) updateData.provider_key = input.providerKey;
    if (input.apiEndpoint !== undefined) updateData.api_endpoint = input.apiEndpoint;
    if (input.apiKeyHeader !== undefined) updateData.api_key_header = input.apiKeyHeader;
    if (input.apiKeyPrefix !== undefined) updateData.api_key_prefix = input.apiKeyPrefix;
    if (input.aiType !== undefined) updateData.ai_type = input.aiType;
    if (input.models !== undefined) updateData.models = input.models;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    const { error: updateError } = await supabase
      .from('custom_ai_providers')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    await fetchProviders();
  }, [user, fetchProviders]);

  const deleteProvider = useCallback(async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error: deleteError } = await supabase
      .from('custom_ai_providers')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    await fetchProviders();
  }, [user, fetchProviders]);

  // Get providers for a specific AI type
  const getProvidersForType = useCallback((aiType: 'content' | 'quiz') => {
    return providers.filter(p => p.is_active && (p.ai_type === aiType || p.ai_type === 'both'));
  }, [providers]);

  return {
    providers,
    loading,
    error,
    createProvider,
    updateProvider,
    deleteProvider,
    getProvidersForType,
    refetch: fetchProviders,
  };
}
