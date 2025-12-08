import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const activities = [
  {
    id: 1,
    user: "Sofia Rahman",
    role: "UX Designer",
    action: "Created new post",
    time: "2 mins ago",
    rating: 9.0,
    avatar: "sofia",
  },
  {
    id: 2,
    user: "Omar Hossain",
    role: "Project Lead",
    action: "Updated profile",
    time: "20 mins ago",
    rating: 8.9,
    avatar: "omar",
  },
  {
    id: 3,
    user: "Lily Carter",
    role: "QA Specialist",
    action: "Added comment",
    time: "30 mins ago",
    rating: 8.7,
    avatar: "lily",
  },
  {
    id: 4,
    user: "Guadalupe Chen",
    role: "DevOps Specialist",
    action: "Tagged a post",
    time: "55 mins ago",
    rating: 8.5,
    avatar: "guadalupe",
  },
];

export function RecentActivity() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-card-foreground">Recent Activities</h3>
        <button className="text-sm font-medium text-primary hover:underline">
          See All
        </button>
      </div>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.avatar}`} />
              <AvatarFallback>{activity.user.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-card-foreground truncate">
                {activity.user}
              </p>
              <p className="text-xs text-primary">{activity.role}</p>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="text-sm font-medium text-card-foreground">
                {activity.rating}
              </span>
            </div>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              {activity.time}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
