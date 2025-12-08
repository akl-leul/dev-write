import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/crud/DataTable";
import { DeleteDialog } from "@/components/crud/DeleteDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CommentLike {
  id: string;
  user_id: string;
  comment_id: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
    profile_image_url: string;
  };
  comments?: {
    id: string;
    content_markdown: string;
    post_id: string;
    posts?: {
      id: string;
      title: string;
      slug: string;
    };
  };
}

export default function CommentLikesPage() {
  const [commentLikes, setCommentLikes] = useState<CommentLike[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLike, setSelectedLike] = useState<CommentLike | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommentLikes();
  }, []);

  const fetchCommentLikes = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('comment_likes')
        .select(`
          *,
          profiles:user_id (id, full_name, profile_image_url),
          comments:comment_id (id, content_markdown, post_id, posts:post_id (id, title, slug))
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCommentLikes(data || []);
    } catch (error) {
      console.error('Error fetching comment likes:', error);
      toast.error('Failed to fetch comment likes');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<CommentLike>[] = [
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
      key: "comment_id",
      header: "Comment",
      render: (like) => (
        <div className="max-w-xs">
          <p className="truncate">{like.comments?.content_markdown || "Unknown Comment"}</p>
          <Link 
            to={`/post/${like.comments?.posts?.slug}`}
            className="text-xs text-blue-600 hover:underline block"
          >
            {like.comments?.posts?.title || "Unknown Post"}
          </Link>
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Liked At",
      render: (like) => new Date(like.created_at).toLocaleString(),
    },
  ];

  const handleAdd = () => {
    toast.info("Comment likes are typically created through user interactions");
  };

  const handleEdit = () => {
    toast.info("Comment likes cannot be edited - they can only be created or deleted");
  };

  const handleDelete = (like: CommentLike) => {
    setSelectedLike(like);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedLike) {
      try {
        const { error } = await (supabase as any)
          .from('comment_likes')
          .delete()
          .eq('id', selectedLike.id);
        
        if (error) throw error;
        await fetchCommentLikes();
        toast.success("Comment like removed successfully");
      } catch (error) {
        console.error('Error deleting comment like:', error);
        toast.error('Failed to delete comment like');
      }
    }
    setDeleteDialogOpen(false);
  };

  return (
    <AdminLayout title="Comment Likes">
      <DataTable
        data={commentLikes}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title="Comment Like"
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Remove Comment Like"
        description="Are you sure you want to remove this comment like?"
      />
    </AdminLayout>
  );
}
