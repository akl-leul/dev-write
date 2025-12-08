import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/crud/DataTable";
import { DeleteDialog } from "@/components/crud/DeleteDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Follower {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  follower_profile?: {
    id: string;
    full_name: string;
    profile_image_url: string;
  };
  following_profile?: {
    id: string;
    full_name: string;
    profile_image_url: string;
  };
}

export default function FollowersPage() {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFollower, setSelectedFollower] = useState<Follower | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFollowers();
  }, []);

  const fetchFollowers = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('followers')
        .select(`
          *,
          follower_profile:follower_id (id, full_name, profile_image_url),
          following_profile:following_id (id, full_name, profile_image_url)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFollowers(data || []);
    } catch (error) {
      console.error('Error fetching followers:', error);
      toast.error('Failed to fetch followers');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<Follower>[] = [
    {
      key: "follower_id",
      header: "Follower",
      render: (follow) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={follow.follower_profile?.profile_image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${follow.follower_profile?.full_name}`} 
            />
            <AvatarFallback>{follow.follower_profile?.full_name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <Link 
            to={`/author/${follow.follower_profile?.id}`}
            className="hover:text-blue-600 hover:underline"
          >
            {follow.follower_profile?.full_name || "Unknown"}
          </Link>
        </div>
      ),
    },
    {
      key: "following_id",
      header: "Following",
      render: (follow) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={follow.following_profile?.profile_image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${follow.following_profile?.full_name}`} 
            />
            <AvatarFallback>{follow.following_profile?.full_name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <Link 
            to={`/author/${follow.following_profile?.id}`}
            className="hover:text-blue-600 hover:underline"
          >
            {follow.following_profile?.full_name || "Unknown"}
          </Link>
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Followed At",
      render: (follow) => new Date(follow.created_at).toLocaleString(),
    },
  ];

  const handleAdd = () => {
    toast.info("Follows are typically created through user interactions");
  };

  const handleEdit = () => {
    toast.info("Follows cannot be edited - they can only be created or deleted");
  };

  const handleDelete = (follower: Follower) => {
    setSelectedFollower(follower);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedFollower) {
      setFollowers(followers.filter((f) => f.id !== selectedFollower.id));
      toast.success("Follow relationship removed successfully");
    }
    setDeleteDialogOpen(false);
  };

  return (
    <AdminLayout title="Followers">
      <DataTable
        data={followers}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title="Follow"
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Remove Follow"
        description="Are you sure you want to remove this follow relationship?"
      />
    </AdminLayout>
  );
}
