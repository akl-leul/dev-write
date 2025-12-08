import { LineChart, Line, ResponsiveContainer } from "recharts";

interface MiniChartProps {
  data: number[];
  color: string;
}

export function MiniChart({ data, color }: MiniChartProps) {
  const chartData = data.map((value, index) => ({ value, index }));

  return (
    <div className="h-12 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
