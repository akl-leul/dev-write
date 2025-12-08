import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const data = [
  { name: "Facebook", value: 35, color: "hsl(217, 91%, 60%)" },
  { name: "LinkedIn", value: 25, color: "hsl(199, 89%, 48%)" },
  { name: "Instagram", value: 20, color: "hsl(280, 65%, 60%)" },
  { name: "X", value: 12, color: "hsl(222, 47%, 11%)" },
  { name: "YouTube", value: 8, color: "hsl(0, 84%, 60%)" },
];

export function TrafficChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm animate-fade-in">
      <h3 className="mb-4 text-lg font-semibold text-card-foreground">Traffic</h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(var(--card-foreground))" }}
            />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-center">
        <p className="text-2xl font-bold text-card-foreground">100%</p>
        <p className="text-sm text-muted-foreground">Total Traffic</p>
      </div>
    </div>
  );
}
