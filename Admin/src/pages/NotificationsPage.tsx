import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/crud/DataTable";
import { FormDialog } from "@/components/crud/FormDialog";
import { DeleteDialog } from "@/components/crud/DeleteDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
}

const typeColors: Record<string, string> = {
  like: "bg-destructive/10 text-destructive border-destructive/20",
  comment: "bg-primary/10 text-primary border-primary/20",
  follow: "bg-success/10 text-success border-success/20",
  mention: "bg-warning/10 text-warning border-warning/20",
  system: "bg-blue-50 text-blue-600 border-blue-200",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [formData, setFormData] = useState<Partial<Notification>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    fetchProfiles();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name');
      
      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const getUserName = (userId: string) => {
    const profile = profiles.find((p) => p.id === userId);
    return profile?.full_name || "Unknown User";
  };

  const columns: Column<Notification>[] = [
    {
      key: "type",
      header: "Type",
      render: (notif) => (
        <Badge variant="outline" className={typeColors[notif.type] || "bg-muted"}>
          {notif.type}
        </Badge>
      ),
    },
    { key: "title", header: "Title" },
    {
      key: "message",
      header: "Message",
      render: (notif) => (
        <p className="max-w-xs truncate">{notif.message || "-"}</p>
      ),
    },
    {
      key: "user_id",
      header: "User",
      render: (notif) => getUserName(notif.user_id),
    },
    {
      key: "read",
      header: "Status",
      render: (notif) => (
        <Badge
          variant="outline"
          className={
            notif.read
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary border-primary/20"
          }
        >
          {notif.read ? "Read" : "Unread"}
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (notif) => new Date(notif.created_at).toLocaleDateString(),
    },
  ];

  const handleAdd = () => {
    setSelectedNotification(null);
    setFormData({
      type: "system",
      title: "",
      message: "",
      read: false,
      user_id: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (notification: Notification) => {
    setSelectedNotification(notification);
    setFormData(notification);
    setDialogOpen(true);
  };

  const handleDelete = (notification: Notification) => {
    setSelectedNotification(notification);
    setDeleteDialogOpen(true);
  };

  const handleBulkDelete = async (items: Notification[]) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', items.map(item => item.id));
      
      if (error) throw error;
      await fetchNotifications();
      toast.success(`Deleted ${items.length} notifications`);
    } catch (error) {
      console.error('Error bulk deleting notifications:', error);
      toast.error('Failed to delete notifications');
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.user_id) {
        toast.error('Please select a user');
        return;
      }

      if (selectedNotification) {
        const { error } = await (supabase as any)
          .from('notifications')
          .update({
            user_id: formData.user_id,
            title: formData.title,
            message: formData.message,
            type: formData.type,
            read: formData.read
          })
          .eq('id', selectedNotification.id);
        
        if (error) throw error;
        toast.success("Notification updated successfully");
      } else {
        const { error } = await (supabase as any)
          .from('notifications')
          .insert({
            user_id: formData.user_id,
            title: formData.title,
            message: formData.message,
            type: formData.type || "like",
            read: formData.read || false,
            created_at: new Date().toISOString()
          });
        
        if (error) throw error;
        toast.success("Notification created successfully");
      }
      
      await fetchNotifications();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving notification:', error);
      toast.error('Failed to save notification');
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedNotification) {
      try {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', selectedNotification.id);
        
        if (error) throw error;
        await fetchNotifications();
        toast.success("Notification deleted successfully");
      } catch (error) {
        console.error('Error deleting notification:', error);
        toast.error('Failed to delete notification');
      }
    }
    setDeleteDialogOpen(false);
  };

  return (
    <AdminLayout title="Notifications">
      <DataTable
        data={notifications}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        title="Notification"
      />

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        title={selectedNotification ? "Edit Notification" : "Add Notification"}
        isEdit={!!selectedNotification}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user">User</Label>
            <Select
              value={formData.user_id || ""}
              onValueChange={(value) => setFormData({ ...formData, user_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="like">Like</SelectItem>
                <SelectItem value="comment">Comment</SelectItem>
                <SelectItem value="follow">Follow</SelectItem>
                <SelectItem value="mention">Mention</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={formData.message || ""}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.read}
              onCheckedChange={(checked) => setFormData({ ...formData, read: checked })}
            />
            <Label>Mark as read</Label>
          </div>
        </div>
      </FormDialog>

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Notification"
        description="Are you sure you want to delete this notification?"
      />
    </AdminLayout>
  );
}
