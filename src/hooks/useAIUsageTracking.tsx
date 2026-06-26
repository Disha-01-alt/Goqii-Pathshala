import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AIUsageLog {
  id: string;
  user_id: string;
  provider: string;
  model: string | null;
  ai_type: 'content' | 'quiz';
  operation: string | null;
  tokens_input: number;
  tokens_output: number;
  tokens_total: number;
  cost_estimate: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UsageStats {
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  byProvider: Record<string, { calls: number; tokens: number; cost: number }>;
  byType: Record<string, { calls: number; tokens: number; cost: number }>;
  recentLogs: AIUsageLog[];
}

// Approximate cost per 1K tokens for different providers (in USD)
export const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  // Content AI
  google: { input: 0.0001, output: 0.0003 },
  openai: { input: 0.005, output: 0.015 },
  perplexity: { input: 0.001, output: 0.001 },
  // Quiz AI
  mistral: { input: 0.0002, output: 0.0006 },
  anthropic: { input: 0.003, output: 0.015 },
  // Custom / default
  default: { input: 0.001, output: 0.002 },
};

export function useAIUsageTracking() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsageStats = useCallback(async () => {
    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch all usage logs for the current user
      const { data, error: fetchError } = await supabase
        .from('ai_usage_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      const logs = (data || []) as unknown as AIUsageLog[];

      // Calculate stats
      const byProvider: Record<string, { calls: number; tokens: number; cost: number }> = {};
      const byType: Record<string, { calls: number; tokens: number; cost: number }> = {};
      let totalCalls = 0;
      let totalTokens = 0;
      let totalCost = 0;

      logs.forEach((log) => {
        totalCalls++;
        totalTokens += log.tokens_total || 0;
        totalCost += Number(log.cost_estimate) || 0;

        // By provider
        if (!byProvider[log.provider]) {
          byProvider[log.provider] = { calls: 0, tokens: 0, cost: 0 };
        }
        byProvider[log.provider].calls++;
        byProvider[log.provider].tokens += log.tokens_total || 0;
        byProvider[log.provider].cost += Number(log.cost_estimate) || 0;

        // By type
        if (!byType[log.ai_type]) {
          byType[log.ai_type] = { calls: 0, tokens: 0, cost: 0 };
        }
        byType[log.ai_type].calls++;
        byType[log.ai_type].tokens += log.tokens_total || 0;
        byType[log.ai_type].cost += Number(log.cost_estimate) || 0;
      });

      setStats({
        totalCalls,
        totalTokens,
        totalCost,
        byProvider,
        byType,
        recentLogs: logs.slice(0, 10),
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch usage stats'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUsageStats();
  }, [fetchUsageStats]);

  // Log an AI usage event
  const logUsage = useCallback(async (params: {
    provider: string;
    model?: string;
    aiType: 'content' | 'quiz';
    operation?: string;
    tokensInput?: number;
    tokensOutput?: number;
    metadata?: Record<string, unknown>;
  }) => {
    if (!user) return;

    const tokensInput = params.tokensInput || 0;
    const tokensOutput = params.tokensOutput || 0;
    const tokensTotal = tokensInput + tokensOutput;

    // Calculate cost estimate
    const costs = TOKEN_COSTS[params.provider] || TOKEN_COSTS.default;
    const costEstimate = (tokensInput / 1000 * costs.input) + (tokensOutput / 1000 * costs.output);

    try {
      const insertData = {
        user_id: user.id,
        provider: params.provider,
        model: params.model || null,
        ai_type: params.aiType,
        operation: params.operation || null,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        tokens_total: tokensTotal,
        cost_estimate: costEstimate,
        metadata: params.metadata || {},
      };

      const { error: insertError } = await supabase
        .from('ai_usage_log')
        .insert(insertData as any);
      if (insertError) {
        console.error('Failed to log AI usage:', insertError);
      }
    } catch (err) {
      console.error('Error logging AI usage:', err);
    }
  }, [user]);

  // Get usage for a specific time period
  const getUsageForPeriod = useCallback(async (startDate: Date, endDate: Date) => {
    if (!user) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from('ai_usage_log')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      return data as unknown as AIUsageLog[];
    } catch (err) {
      console.error('Error fetching usage for period:', err);
      return null;
    }
  }, [user]);

  return {
    stats,
    loading,
    error,
    logUsage,
    refetch: fetchUsageStats,
    getUsageForPeriod,
  };
}
