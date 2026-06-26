import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { LucideIcon } from "lucide-react";

export interface PieChartData {
  name: string;
  value: number;
  color: string;
}

interface PieChartCardProps {
  title: string;
  icon?: LucideIcon;
  data: PieChartData[];
  centerLabel?: string;
  centerValue?: number | string;
  emptyMessage?: string;
}

export function PieChartCard({
  title,
  icon: Icon,
  data,
  centerLabel = "Total",
  centerValue,
  emptyMessage = "No data available"
}: PieChartCardProps) {
  const total = centerValue ?? data.reduce((sum, item) => sum + item.value, 0);
  const hasData = data.some(item => item.value > 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 px-4">
        {hasData ? (
          <>
            {/* Chart Container */}
            <div className="relative h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as PieChartData;
                        return (
                          <div className="bg-popover border rounded-lg px-3 py-2 shadow-md">
                            <p className="text-sm font-medium">{data.name}</p>
                            <p className="text-xs text-muted-foreground">{data.value}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center Label */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-2xl font-bold">{total}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{centerLabel}</p>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3 space-y-1.5">
              {data.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground truncate">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-[180px] flex items-center justify-center">
            <p className="text-xs text-muted-foreground text-center">{emptyMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
