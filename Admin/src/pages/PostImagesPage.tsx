import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/crud/DataTable";
import { FormDialog } from "@/components/crud/FormDialog";
import { DeleteDialog } from "@/components/crud/DeleteDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PostImage {
  id: string;
  post_id: string;
  url: string;
  alt_text?: string;
  order_index?: number;
  created_at: string;
  posts?: {
    id: string;
    title: string;
    slug: string;
  };
}

export default function PostImagesPage() {
  const [postImages, setPostImages] = useState<PostImage[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<PostImage | null>(null);
  const [formData, setFormData] = useState<Partial<PostImage>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPostImages();
  }, []);

  const fetchPostImages = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('post_images')
        .select(`
          *,
          posts:post_id (id, title, slug)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPostImages(data || []);
    } catch (error) {
      console.error('Error fetching post images:', error);
      toast.error('Failed to fetch post images');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<PostImage>[] = [
    {
      key: "url",
      header: "Image",
      render: (image) => (
        <img
          src={image.url}
          alt="Post image"
          className="h-12 w-16 rounded object-cover"
        />
      ),
    },
    {
      key: "post_id",
      header: "Post",
      render: (image) => (
        <Link 
          to={`/post/${image.posts?.slug}`}
          className="hover:text-blue-600 hover:underline max-w-xs truncate block"
        >
          {image.posts?.title || "Unknown Post"}
        </Link>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (image) => new Date(image.created_at).toLocaleDateString(),
    },
  ];

  const handleAdd = () => {
    setSelectedImage(null);
    setFormData({
      url: "",
      alt_text: "",
      order_index: 0,
    });
    setDialogOpen(true);
  };

  const handleEdit = (image: PostImage) => {
    setSelectedImage(image);
    setFormData(image);
    setDialogOpen(true);
  };

  const handleDelete = (image: PostImage) => {
    setSelectedImage(image);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = () => {
    if (selectedImage) {
      setPostImages(postImages.map((i) => 
        i.id === selectedImage.id ? { ...i, ...formData } as PostImage : i
      ));
      toast.success("Image updated successfully");
    } else {
      const newImage: PostImage = {
        id: crypto.randomUUID(),
        post_id: "placeholder-post-id", // TODO: Replace with actual post ID
        created_at: new Date().toISOString(),
        ...formData,
      } as PostImage;
      setPostImages([newImage, ...postImages]);
      toast.success("Image added successfully");
    }
    setDialogOpen(false);
  };

  const handleConfirmDelete = () => {
    if (selectedImage) {
      setPostImages(postImages.filter((i) => i.id !== selectedImage.id));
      toast.success("Image deleted successfully");
    }
    setDeleteDialogOpen(false);
  };

  return (
    <AdminLayout title="Post Images">
      <DataTable
        data={postImages}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title="Image"
      />

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        title={selectedImage ? "Edit Image" : "Add Image"}
        isEdit={!!selectedImage}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Image URL</Label>
            <Input
              id="url"
              value={formData.url || ""}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alt_text">Alt Text</Label>
            <Input
              id="alt_text"
              value={formData.alt_text || ""}
              onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="order_index">Order Index</Label>
            <Input
              id="order_index"
              type="number"
              value={formData.order_index || 0}
              onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
            />
          </div>
        </div>
      </FormDialog>

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Image"
        description="Are you sure you want to delete this image?"
      />
    </AdminLayout>
  );
}
