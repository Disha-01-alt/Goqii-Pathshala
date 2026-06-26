import { useAIUsageTracking, UsageStats } from "@/hooks/useAIUsageTracking";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3, Zap, DollarSign, Activity, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function AIUsageStats() {
  const { stats, loading, error } = useAIUsageTracking();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive text-center py-4">
        Failed to load usage statistics
      </div>
    );
  }

  if (!stats || stats.totalCalls === 0) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">No AI usage data yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Usage will be tracked when you generate content or quizzes
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Zap className="h-4 w-4" />}
          label="Total Calls"
          value={stats.totalCalls.toLocaleString()}
          iconBg="bg-blue-500/20"
          iconColor="text-blue-600"
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Total Tokens"
          value={formatTokens(stats.totalTokens)}
          iconBg="bg-violet-500/20"
          iconColor="text-violet-600"
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Est. Cost"
          value={`$${stats.totalCost.toFixed(4)}`}
          iconBg="bg-green-500/20"
          iconColor="text-green-600"
        />
      </div>

      {/* By Type Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(stats.byType).map(([type, data]) => (
          <div
            key={type}
            className={cn(
              "p-3 rounded-lg border",
              type === 'content' ? 'bg-violet-500/5' : 'bg-amber-500/5'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium capitalize">{type} AI</span>
              <span className="text-xs text-muted-foreground">{data.calls} calls</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatTokens(data.tokens)} tokens</span>
              <span className="text-green-600">${data.cost.toFixed(4)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* By Provider Breakdown */}
      {Object.keys(stats.byProvider).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Usage by Provider
          </h4>
          <div className="space-y-2">
            {Object.entries(stats.byProvider).map(([provider, data]) => (
              <ProviderUsageBar
                key={provider}
                provider={provider}
                calls={data.calls}
                tokens={data.tokens}
                cost={data.cost}
                maxCalls={Math.max(...Object.values(stats.byProvider).map(p => p.calls))}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {stats.recentLogs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recent Activity</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {stats.recentLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded"
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                    log.ai_type === 'content' ? 'bg-violet-500/20 text-violet-600' : 'bg-amber-500/20 text-amber-600'
                  )}>
                    {log.ai_type}
                  </span>
                  <span className="capitalize">{log.provider}</span>
                  {log.operation && (
                    <span className="text-muted-foreground">• {log.operation}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{formatTokens(log.tokens_total)} tokens</span>
                  <span>{format(new Date(log.created_at), 'MMM d, HH:mm')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className={cn("p-1.5 rounded w-fit mb-2", iconBg)}>
        <div className={iconColor}>{icon}</div>
      </div>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ProviderUsageBar({
  provider,
  calls,
  tokens,
  cost,
  maxCalls,
}: {
  provider: string;
  calls: number;
  tokens: number;
  cost: number;
  maxCalls: number;
}) {
  const percentage = (calls / maxCalls) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="capitalize font-medium">{provider}</span>
        <span className="text-muted-foreground">
          {calls} calls • {formatTokens(tokens)} tokens • ${cost.toFixed(4)}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}
