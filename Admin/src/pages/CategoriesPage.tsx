import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/crud/DataTable";
import { FormDialog } from "@/components/crud/FormDialog";
import { DeleteDialog } from "@/components/crud/DeleteDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Partial<Category>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

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
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<Category>[] = [
    { key: "name", header: "Name" },
    { key: "slug", header: "Slug" },
    {
      key: "created_at",
      header: "Created",
      render: (cat) => new Date(cat.created_at).toLocaleDateString(),
    },
  ];

  const handleAdd = () => {
    setSelectedCategory(null);
    setFormData({ name: "", slug: "" });
    setDialogOpen(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setFormData(category);
    setDialogOpen(true);
  };

  const handleDelete = (category: Category) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleBulkDelete = async (items: Category[]) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .in('id', items.map(item => item.id));

      if (error) throw error;
      
      await fetchCategories();
      toast.success(`Deleted ${items.length} categories`);
    } catch (error) {
      console.error('Error deleting categories:', error);
      toast.error('Failed to delete categories');
    }
  };

  const handleSubmit = async () => {
    try {
      if (selectedCategory) {
        const { error } = await supabase
          .from('categories')
          .update(formData)
          .eq('id', selectedCategory.id);

        if (error) throw error;
        toast.success("Category updated successfully");
      } else {
        const { error } = await supabase
          .from('categories')
          .insert({
            created_at: new Date().toISOString(),
            ...formData,
          });

        if (error) throw error;
        toast.success("Category created successfully");
      }
      
      await fetchCategories();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedCategory) {
      try {
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', selectedCategory.id);

        if (error) throw error;
        
        await fetchCategories();
        toast.success("Category deleted successfully");
      } catch (error) {
        console.error('Error deleting category:', error);
        toast.error('Failed to delete category');
      }
    }
    setDeleteDialogOpen(false);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  };

  return (
    <AdminLayout title="Categories">
      <DataTable
        data={categories}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        title="Category"
      />

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        title={selectedCategory ? "Edit Category" : "Add Category"}
        isEdit={!!selectedCategory}
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
        </div>
      </FormDialog>

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Category"
        description="Are you sure you want to delete this category? Posts using this category will be uncategorized."
      />
    </AdminLayout>
  );
}
