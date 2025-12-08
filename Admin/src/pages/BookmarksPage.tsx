import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/crud/DataTable";
import { DeleteDialog } from "@/components/crud/DeleteDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Bookmark {
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

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      console.log('Fetching bookmarks...');
      
      // First check if any bookmarks exist at all
      const { data: countData, error: countError } = await (supabase as any)
        .from('bookmarks')
        .select('id')
        .limit(10);
      
      console.log('Bookmarks count test:', { countData, countError, count: countData?.length });
      
      // First try a simple query to see if we can access the table
      const { data: simpleData, error: simpleError } = await (supabase as any)
        .from('bookmarks')
        .select('count')
        .limit(1);
      
      console.log('Simple bookmarks test:', { simpleData, simpleError });
      
      // Now try the full query
      let { data, error } = await (supabase as any)
        .from('bookmarks')
        .select(`
          *,
          profiles!bookmarks_user_id_fkey (id, full_name, profile_image_url),
          posts!bookmarks_post_id_fkey (id, title, slug)
        `)
        .order('created_at', { ascending: false });
      
      console.log('Full bookmarks query result:', { data, error });
      
      // If regular client fails, try admin client
      if (error) {
        console.log('Regular client failed, trying admin client...');
        const adminClient = supabase as any;
        const { data: adminData, error: adminError } = await adminClient
          .from('bookmarks')
          .select(`
            *,
            profiles!bookmarks_user_id_fkey (id, full_name, profile_image_url),
            posts!bookmarks_post_id_fkey (id, title, slug)
          `)
          .order('created_at', { ascending: false });
        
        console.log('Admin client result:', { adminData, adminError });
        
        if (adminError) {
          throw adminError;
        }
        
        data = adminData;
        error = null;
      }
      
      if (error) {
        console.error('Bookmarks query error details:', error);
        throw error;
      }
      
      console.log(`Fetched ${data?.length || 0} bookmarks`);
      setBookmarks(data || []);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      toast.error(`Failed to fetch bookmarks: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  const columns: Column<Bookmark>[] = [
    {
      key: "user_id",
      header: "User",
      render: (bookmark) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={bookmark.profiles?.profile_image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${bookmark.profiles?.full_name}`} 
            />
            <AvatarFallback>{bookmark.profiles?.full_name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <Link 
            to={`/author/${bookmark.profiles?.id}`}
            className="hover:text-blue-600 hover:underline"
          >
            {bookmark.profiles?.full_name || "Unknown"}
          </Link>
        </div>
      ),
    },
    {
      key: "post_id",
      header: "Post",
      render: (bookmark) => (
        <Link 
          to={`/post/${bookmark.posts?.slug}`}
          className="hover:text-blue-600 hover:underline max-w-xs truncate block"
        >
          {bookmark.posts?.title || "Unknown Post"}
        </Link>
      ),
    },
    {
      key: "created_at",
      header: "Bookmarked At",
      render: (bookmark) => new Date(bookmark.created_at).toLocaleString(),
    },
  ];

  const handleAdd = () => {
    toast.info("Bookmarks are typically created through user interactions");
  };

  const handleEdit = () => {
    toast.info("Bookmarks cannot be edited - they can only be created or deleted");
  };

  const handleDelete = (bookmark: Bookmark) => {
    setSelectedBookmark(bookmark);
    setDeleteDialogOpen(true);
  };

  const handleBulkDelete = async (items: Bookmark[]) => {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .in('id', items.map(item => item.id));
      
      if (error) throw error;
      await fetchBookmarks();
      toast.success(`Deleted ${items.length} bookmarks`);
    } catch (error) {
      console.error('Error bulk deleting bookmarks:', error);
      toast.error('Failed to delete bookmarks');
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedBookmark) {
      try {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('id', selectedBookmark.id);
        
        if (error) throw error;
        await fetchBookmarks();
        toast.success("Bookmark removed successfully");
      } catch (error) {
        console.error('Error deleting bookmark:', error);
        toast.error('Failed to delete bookmark');
      }
    }
    setDeleteDialogOpen(false);
  };

  return (
    <AdminLayout title="Bookmarks">
      <DataTable
        data={bookmarks}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        title="Bookmark"
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Remove Bookmark"
        description="Are you sure you want to remove this bookmark?"
      />
    </AdminLayout>
  );
}
