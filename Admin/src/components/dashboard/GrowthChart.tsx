import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const dailyData = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  value: Math.floor(Math.random() * 40) + 30,
}));

const weeklyData = Array.from({ length: 12 }, (_, i) => ({
  day: `W${i + 1}`,
  value: Math.floor(Math.random() * 50) + 40,
}));

const monthlyData = [
  { day: "Jan", value: 45 },
  { day: "Feb", value: 52 },
  { day: "Mar", value: 48 },
  { day: "Apr", value: 61 },
  { day: "May", value: 55 },
  { day: "Jun", value: 67 },
  { day: "Jul", value: 72 },
  { day: "Aug", value: 68 },
  { day: "Sep", value: 75 },
  { day: "Oct", value: 82 },
  { day: "Nov", value: 78 },
  { day: "Dec", value: 85 },
];

const yearlyData = [
  { day: "2020", value: 45 },
  { day: "2021", value: 58 },
  { day: "2022", value: 72 },
  { day: "2023", value: 85 },
  { day: "2024", value: 92 },
];

type Period = "daily" | "weekly" | "monthly" | "yearly";

export function GrowthChart() {
  const [period, setPeriod] = useState<Period>("monthly");

  const getData = () => {
    switch (period) {
      case "daily":
        return dailyData;
      case "weekly":
        return weeklyData;
      case "monthly":
        return monthlyData;
      case "yearly":
        return yearlyData;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm animate-fade-in">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-card-foreground">
          Follower Growth
        </h3>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(["daily", "weekly", "monthly", "yearly"] as Period[]).map((p) => (
            <Button
              key={p}
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-3 text-xs capitalize",
                period === p && "bg-card shadow-sm"
              )}
              onClick={() => setPeriod(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={getData()}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(217, 91%, 60%)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(217, 91%, 60%)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(var(--card-foreground))" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
