import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/crud/DataTable";
import { FormDialog } from "@/components/crud/FormDialog";
import { DeleteDialog } from "@/components/crud/DeleteDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { moderateContent, ModerationResult } from "@/lib/contentModeration";
import { toast } from "sonner";

interface Post {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  content_markdown: string;
  excerpt: string | null;
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
  views: number;
  read_time: number;
  featured_image: string | null;
  category_id: string | null;
  allow_comments: boolean;
  comments_enabled: boolean;
  is_published: boolean;
  views_count: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

const statusColors = {
  draft: "bg-warning/10 text-warning border-warning/20",
  published: "bg-success/10 text-success border-success/20",
  archived: "bg-muted text-muted-foreground border-muted",
};

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [formData, setFormData] = useState<Partial<Post>>({});
  const [moderationWarning, setModerationWarning] = useState<ModerationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
    fetchCategories();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const columns: Column<Post>[] = [
    {
      key: "title",
      header: "Title",
      render: (post) => (
        <div>
          <p className="font-medium">{post.title}</p>
          <p className="text-sm text-muted-foreground">{post.slug}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (post) => (
        <Badge variant="outline" className={statusColors[post.status]}>
          {post.status}
        </Badge>
      ),
    },
    { key: "views", header: "Views" },
    { key: "read_time", header: "Read Time", render: (post) => `${post.read_time} min` },
    {
      key: "created_at",
      header: "Created",
      render: (post) => new Date(post.created_at).toLocaleDateString(),
    },
  ];

  const handleContentChange = (content: string, field: "title" | "content_markdown" | "excerpt") => {
    const result = moderateContent(content);
    if (result.flagged) {
      setModerationWarning(result);
    } else {
      setModerationWarning(null);
    }
    setFormData({ ...formData, [field]: content });
  };

  const handleAdd = () => {
    setSelectedPost(null);
    setFormData({
      title: "",
      slug: "",
      content_markdown: "",
      excerpt: "",
      status: "draft",
      category_id: "",
      read_time: 5,
      allow_comments: true,
      comments_enabled: true,
      is_published: false,
    });
    setModerationWarning(null);
    setDialogOpen(true);
  };

  const handleEdit = (post: Post) => {
    setSelectedPost(post);
    setFormData(post);
    setModerationWarning(null);
    setDialogOpen(true);
  };

  const handleDelete = (post: Post) => {
    setSelectedPost(post);
    setDeleteDialogOpen(true);
  };

  const handleBulkDelete = async (items: Post[]) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .in('id', items.map(item => item.id));

      if (error) throw error;
      
      await fetchPosts();
      toast.success(`Deleted ${items.length} posts`);
    } catch (error) {
      console.error('Error deleting posts:', error);
      toast.error('Failed to delete posts');
    }
  };

  const handleSubmit = async () => {
    // Check for hate speech before saving
    const titleResult = moderateContent(formData.title || "");
    const contentResult = moderateContent(formData.content_markdown || "");
    
    if (titleResult.shouldDelete || contentResult.shouldDelete) {
      toast.error("Content contains prohibited language and cannot be saved");
      return;
    }

    try {
      if (selectedPost) {
        const { error } = await supabase
          .from('posts')
          .update({
            title: formData.title,
            slug: formData.slug,
            content_markdown: formData.content_markdown,
            excerpt: formData.excerpt,
            status: formData.status,
            category_id: formData.category_id,
            read_time: formData.read_time,
            comments_enabled: formData.comments_enabled,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedPost.id);

        if (error) throw error;
        toast.success("Post updated successfully");
      } else {
        const { error } = await supabase
          .from('posts')
          .insert({
            author_id: "current-user", // Replace with actual user ID
            views: 0,
            views_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            featured_image: null,
            title: formData.title,
            slug: formData.slug,
            content_markdown: formData.content_markdown,
            excerpt: formData.excerpt,
            status: formData.status,
            category_id: formData.category_id,
            read_time: formData.read_time,
            comments_enabled: formData.comments_enabled,
          });

        if (error) throw error;
        toast.success("Post created successfully");
      }
      
      await fetchPosts();
      setDialogOpen(false);
      setModerationWarning(null);
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Failed to save post');
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedPost) {
      try {
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', selectedPost.id);

        if (error) throw error;
        
        await fetchPosts();
        toast.success("Post deleted successfully");
      } catch (error) {
        console.error('Error deleting post:', error);
        toast.error('Failed to delete post');
      }
    }
    setDeleteDialogOpen(false);
  };

  return (
    <AdminLayout title="Posts">
      <DataTable
        data={posts}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        title="Post"
      />

      <FormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setModerationWarning(null);
        }}
        onSubmit={handleSubmit}
        title={selectedPost ? "Edit Post" : "Add Post"}
        isEdit={!!selectedPost}
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title || ""}
                onChange={(e) => handleContentChange(e.target.value, "title")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug || ""}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              value={formData.excerpt || ""}
              onChange={(e) => handleContentChange(e.target.value, "excerpt")}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Content (Markdown)</Label>
            <Textarea
              id="content"
              value={formData.content_markdown || ""}
              onChange={(e) => handleContentChange(e.target.value, "content_markdown")}
              rows={5}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: Post["status"]) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id || ""}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="read_time">Read Time (minutes)</Label>
              <Input
                id="read_time"
                type="number"
                value={formData.read_time || 5}
                onChange={(e) => setFormData({ ...formData, read_time: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-4 pt-8">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.comments_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, comments_enabled: checked })}
                />
                <Label>Comments</Label>
              </div>
            </div>
          </div>
        </div>
      </FormDialog>

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Post"
        description="Are you sure you want to delete this post? All associated comments, likes, and bookmarks will also be removed."
      />
    </AdminLayout>
  );
}
