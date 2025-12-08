import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/crud/DataTable";
import { DeleteDialog } from "@/components/crud/DeleteDialog";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PostTag {
  id: string;
  post_id: string;
  tag_id: string;
  created_at: string;
  posts?: {
    id: string;
    title: string;
    slug: string;
  };
  tags?: {
    id: string;
    name: string;
    color: string;
  };
}

export default function PostTagsPage() {
  const [postTags, setPostTags] = useState<PostTag[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPostTag, setSelectedPostTag] = useState<PostTag | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPostTags();
  }, []);

  const fetchPostTags = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('post_tags')
        .select(`
          *,
          posts:post_id (id, title, slug),
          tags:tag_id (id, name, color)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPostTags(data || []);
    } catch (error) {
      console.error('Error fetching post tags:', error);
      toast.error('Failed to fetch post tags');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<PostTag>[] = [
    {
      key: "post_id",
      header: "Post",
      render: (pt) => (
        <Link 
          to={`/post/${pt.posts?.slug}`}
          className="hover:text-blue-600 hover:underline max-w-xs truncate block"
        >
          {pt.posts?.title || "Unknown Post"}
        </Link>
      ),
    },
    {
      key: "tag_id",
      header: "Tag",
      render: (pt) => {
        const tag = pt.tags;
        return tag ? (
          <Badge
            variant="outline"
            style={{ borderColor: tag.color || "#000", color: tag.color || "#000" }}
            className="bg-transparent"
          >
            {tag.name}
          </Badge>
        ) : (
          "Unknown Tag"
        );
      },
    },
    {
      key: "created_at",
      header: "Created",
      render: (pt) => new Date(pt.created_at).toLocaleDateString(),
    },
  ];

  const handleAdd = () => {
    toast.info("Post tags are typically managed through the post editing interface");
  };

  const handleEdit = () => {
    toast.info("Post tag relationships cannot be edited - they can only be created or deleted");
  };

  const handleDelete = (postTag: PostTag) => {
    setSelectedPostTag(postTag);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedPostTag) {
      setPostTags(postTags.filter((pt) => pt.id !== selectedPostTag.id));
      toast.success("Post tag removed successfully");
    }
    setDeleteDialogOpen(false);
  };

  return (
    <AdminLayout title="Post Tags">
      <DataTable
        data={postTags}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title="Post Tag"
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Remove Post Tag"
        description="Are you sure you want to remove this tag from the post?"
      />
    </AdminLayout>
  );
}
