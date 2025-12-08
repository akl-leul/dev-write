import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/crud/DataTable";
import { FormDialog } from "@/components/crud/FormDialog";
import { DeleteDialog } from "@/components/crud/DeleteDialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { moderateContent, ModerationResult } from "@/lib/contentModeration";
import { toast } from "sonner";

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  content_markdown: string;
  created_at: string;
  updated_at: string;
  approved: boolean;
  posts?: {
    title: string;
  };
  profiles?: {
    full_name: string;
  };
}

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [formData, setFormData] = useState<Partial<Comment>>({});
  const [moderationWarning, setModerationWarning] = useState<ModerationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          posts (title),
          profiles (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<Comment>[] = [
    {
      key: "content_markdown",
      header: "Content",
      render: (comment) => (
        <p className="max-w-xs truncate">{comment.content_markdown}</p>
      ),
    },
    {
      key: "post_id",
      header: "Post",
      render: (comment) => (
        <p className="max-w-[150px] truncate text-sm">{comment.posts?.title || "Unknown Post"}</p>
      ),
    },
    {
      key: "author_id",
      header: "Author",
      render: (comment) => comment.profiles?.full_name || "Unknown Author",
    },
    {
      key: "approved",
      header: "Status",
      render: (comment) => (
        <Badge
          variant="outline"
          className={
            comment.approved
              ? "bg-success/10 text-success border-success/20"
              : "bg-warning/10 text-warning border-warning/20"
          }
        >
          {comment.approved ? "Approved" : "Pending"}
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (comment) => new Date(comment.created_at).toLocaleDateString(),
    },
  ];

  const handleContentChange = (content: string) => {
    const result = moderateContent(content);
    if (result.flagged) {
      setModerationWarning(result);
    } else {
      setModerationWarning(null);
    }
    setFormData({ ...formData, content_markdown: content });
  };

  const handleAdd = () => {
    setSelectedComment(null);
    setFormData({
      content_markdown: "",
      approved: false,
    });
    setModerationWarning(null);
    setDialogOpen(true);
  };

  const handleEdit = (comment: Comment) => {
    setSelectedComment(comment);
    setFormData(comment);
    setModerationWarning(null);
    setDialogOpen(true);
  };

  const handleDelete = (comment: Comment) => {
    setSelectedComment(comment);
    setDeleteDialogOpen(true);
  };

  const handleBulkDelete = async (items: Comment[]) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .in('id', items.map(item => item.id));

      if (error) throw error;
      
      await fetchComments();
      toast.success(`Deleted ${items.length} comments`);
    } catch (error) {
      console.error('Error deleting comments:', error);
      toast.error('Failed to delete comments');
    }
  };

  const handleSubmit = async () => {
    // Check for hate speech before saving
    const result = moderateContent(formData.content_markdown || "");
    
    if (result.shouldDelete) {
      toast.error("Content contains prohibited language and cannot be saved");
      return;
    }

    try {
      if (selectedComment) {
        const { error } = await supabase
          .from('comments')
          .update({
            content_markdown: formData.content_markdown,
            approved: formData.approved,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedComment.id);

        if (error) throw error;
        toast.success("Comment updated successfully");
      } else {
        const { error } = await supabase
          .from('comments')
          .insert({
            post_id: "default-post-id", // Replace with actual post ID
            author_id: "default-author-id", // Replace with actual author ID
            parent_comment_id: null,
            content_markdown: formData.content_markdown,
            approved: formData.approved,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
        toast.success("Comment created successfully");
      }
      
      await fetchComments();
      setDialogOpen(false);
      setModerationWarning(null);
    } catch (error) {
      console.error('Error saving comment:', error);
      toast.error('Failed to save comment');
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedComment) {
      try {
        const { error } = await supabase
          .from('comments')
          .delete()
          .eq('id', selectedComment.id);

        if (error) throw error;
        
        await fetchComments();
        toast.success("Comment deleted successfully");
      } catch (error) {
        console.error('Error deleting comment:', error);
        toast.error('Failed to delete comment');
      }
    }
    setDeleteDialogOpen(false);
  };

  return (
    <AdminLayout title="Comments">
      <DataTable
        data={comments}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        title="Comment"
      />

      <FormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setModerationWarning(null);
        }}
        onSubmit={handleSubmit}
        title={selectedComment ? "Edit Comment" : "Add Comment"}
        isEdit={!!selectedComment}
      >
        <div className="space-y-4">
          {moderationWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {moderationWarning.reason} - This content will be automatically removed if saved.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={formData.content_markdown || ""}
              onChange={(e) => handleContentChange(e.target.value)}
              rows={4}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.approved}
              onCheckedChange={(checked) => setFormData({ ...formData, approved: checked })}
            />
            <Label>Approved</Label>
          </div>
        </div>
      </FormDialog>

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Comment"
        description="Are you sure you want to delete this comment? This action cannot be undone."
      />
    </AdminLayout>
  );
}
