import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/crud/DataTable";
import { FormDialog } from "@/components/crud/FormDialog";
import { DeleteDialog } from "@/components/crud/DeleteDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  created_at: string;
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState<Partial<Tag>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast.error('Failed to fetch tags');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<Tag>[] = [
    {
      key: "name",
      header: "Name",
      render: (tag) => (
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: tag.color }}
          />
          <span>{tag.name}</span>
        </div>
      ),
    },
    { key: "slug", header: "Slug" },
    { key: "color", header: "Color" },
    {
      key: "created_at",
      header: "Created",
      render: (tag) => new Date(tag.created_at).toLocaleDateString(),
    },
  ];

  const handleAdd = () => {
    setSelectedTag(null);
    setFormData({ name: "", slug: "", color: "#3B82F6" });
    setDialogOpen(true);
  };

  const handleEdit = (tag: Tag) => {
    setSelectedTag(tag);
    setFormData(tag);
    setDialogOpen(true);
  };

  const handleDelete = (tag: Tag) => {
    setSelectedTag(tag);
    setDeleteDialogOpen(true);
  };

  const handleBulkDelete = async (items: Tag[]) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .in('id', items.map(item => item.id));

      if (error) throw error;
      
      await fetchTags();
      toast.success(`Deleted ${items.length} tags`);
    } catch (error) {
      console.error('Error deleting tags:', error);
      toast.error('Failed to delete tags');
    }
  };

  const handleSubmit = async () => {
    try {
      if (selectedTag) {
        const { error } = await supabase
          .from('tags')
          .update({
            name: formData.name,
            slug: formData.slug,
            color: formData.color
          })
          .eq('id', selectedTag.id);

        if (error) throw error;
        toast.success("Tag updated successfully");
      } else {
        const { error } = await supabase
          .from('tags')
          .insert({
            created_at: new Date().toISOString(),
            name: formData.name,
            slug: formData.slug,
            color: formData.color
          });

        if (error) throw error;
        toast.success("Tag created successfully");
      }
      
      await fetchTags();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving tag:', error);
      toast.error('Failed to save tag');
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedTag) {
      try {
        const { error } = await supabase
          .from('tags')
          .delete()
          .eq('id', selectedTag.id);

        if (error) throw error;
        
        await fetchTags();
        toast.success("Tag deleted successfully");
      } catch (error) {
        console.error('Error deleting tag:', error);
        toast.error('Failed to delete tag');
      }
    }
    setDeleteDialogOpen(false);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  };

  return (
    <AdminLayout title="Tags">
      <DataTable
        data={tags}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        title="Tag"
      />

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        title={selectedTag ? "Edit Tag" : "Add Tag"}
        isEdit={!!selectedTag}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={(e) => setFormData({ 
                ...formData, 
                name: e.target.value,
                slug: generateSlug(e.target.value)
              })}
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
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                type="color"
                value={formData.color || "#3B82F6"}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-16 h-10 p-1"
              />
              <Input
                value={formData.color || "#3B82F6"}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </FormDialog>

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Tag"
        description="Are you sure you want to delete this tag? It will be removed from all posts."
      />
    </AdminLayout>
  );
}
