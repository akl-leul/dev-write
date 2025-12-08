import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MiniChart } from "./MiniChart";

interface EarningsCardProps {
  title: string;
  value: string;
  data: number[];
  color: string;
}

export function EarningsCard({ title, value, data, color }: EarningsCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-bold text-card-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-2">
        <MiniChart data={data} color={color} />
      </div>
    </div>
  );
}
