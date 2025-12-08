import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/crud/DataTable";
import { DeleteDialog } from "@/components/crud/DeleteDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Like {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
    profile_image_url: string;
  };
  posts?: {
    id: string;
    title: string;
    slug: string;
  };
}

export default function LikesPage() {
  const [likes, setLikes] = useState<Like[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLike, setSelectedLike] = useState<Like | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLikes();
  }, []);

  const fetchLikes = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('likes')
        .select(`
          *,
          profiles:user_id (id, full_name, profile_image_url),
          posts:post_id (id, title, slug)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLikes(data || []);
    } catch (error) {
      console.error('Error fetching likes:', error);
      toast.error('Failed to fetch likes');
    } finally {
      setLoading(false);
    }
  };
  const columns: Column<Like>[] = [
    {
      key: "user_id",
      header: "User",
      render: (like) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={like.profiles?.profile_image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${like.profiles?.full_name}`} 
            />
            <AvatarFallback>{like.profiles?.full_name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <Link 
            to={`/author/${like.profiles?.id}`}
            className="hover:text-blue-600 hover:underline"
          >
            {like.profiles?.full_name || "Unknown"}
          </Link>
        </div>
      ),
    },
    {
      key: "post_id",
      header: "Post",
      render: (like) => (
        <Link 
          to={`/post/${like.posts?.slug}`}
          className="hover:text-blue-600 hover:underline max-w-xs truncate block"
        >
          {like.posts?.title || "Unknown Post"}
        </Link>
      ),
    },
    {
      key: "created_at",
      header: "Liked At",
      render: (like) => new Date(like.created_at).toLocaleString(),
    },
  ];

  const handleAdd = () => {
    toast.info("Likes are typically created through user interactions");
  };

  const handleEdit = () => {
    toast.info("Likes cannot be edited - they can only be created or deleted");
  };

  const handleDelete = (like: Like) => {
    setSelectedLike(like);
    setDeleteDialogOpen(true);
  };

  const handleBulkDelete = async (items: Like[]) => {
    try {
      const { error } = await supabase
        .from('likes')
        .delete()
        .in('id', items.map(item => item.id));
      
      if (error) throw error;
      await fetchLikes();
      toast.success(`Deleted ${items.length} likes`);
    } catch (error) {
      console.error('Error bulk deleting likes:', error);
      toast.error('Failed to delete likes');
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedLike) {
      try {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('id', selectedLike.id);
        
        if (error) throw error;
        await fetchLikes();
        toast.success("Like removed successfully");
      } catch (error) {
        console.error('Error deleting like:', error);
        toast.error('Failed to delete like');
      }
    }
    setDeleteDialogOpen(false);
  };

  return (
    <AdminLayout title="Likes">
      <DataTable
        data={likes}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        title="Like"
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Remove Like"
        description="Are you sure you want to remove this like?"
      />
    </AdminLayout>
  );
}
