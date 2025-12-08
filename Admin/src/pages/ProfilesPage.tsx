import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/crud/DataTable";
import { FormDialog } from "@/components/crud/FormDialog";
import { DeleteDialog } from "@/components/crud/DeleteDialog";
import { UserDetailDialog } from "@/components/crud/UserDetailDialog";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Create a client without type constraints for blocking operations
const supabaseClient = supabase as any;
const supabaseAdminClient = supabaseAdmin as any;

interface Profile {
  id: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  bio: string | null;
  profile_image_url: string | null;
  created_at: string;
  badge: string | null;
  blocked: boolean;
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Fetched profiles:', data?.map(p => ({ id: p.id, name: p.full_name, blocked: p.blocked })));
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast.error('Failed to fetch profiles');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<Profile>[] = [
    {
      key: "full_name",
      header: "User",
      render: (profile) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile.profile_image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.full_name}`} />
            <AvatarFallback>{profile.full_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{profile.full_name}</p>
              {profile.blocked && (
                <Badge variant="destructive" className="text-[10px] px-1 py-0">Blocked</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{profile.phone || "No phone"}</p>
          </div>
        </div>
      ),
    },
    { key: "age", header: "Age" },
    { key: "gender", header: "Gender" },
    {
      key: "badge",
      header: "Badge",
      render: (profile) =>
        profile.badge ? (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {profile.badge}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "blocked",
      header: "Status",
      render: (profile) => (
        <Badge
          variant={profile.blocked ? "destructive" : "outline"}
          className={profile.blocked ? "" : "bg-success/10 text-success border-success/20"}
        >
          {profile.blocked ? "Blocked" : "Active"}
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: "Joined",
      render: (profile) => new Date(profile.created_at).toLocaleDateString(),
    },
  ];

  const handleRowClick = (profile: Profile) => {
    setSelectedProfile(profile);
    setDetailDialogOpen(true);
  };

  const handleBlockUser = async (userId: string, blocked: boolean) => {
    try {
      console.log(`Attempting to ${blocked ? 'block' : 'unblock'} user:`, userId);
      
      // Use admin client to bypass RLS policies
      const { data, error } = await supabaseAdminClient
        .from('profiles')
        .update({ blocked })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log('Update result:', data);
      
      await fetchProfiles();
      toast.success(`User ${blocked ? 'blocked' : 'unblocked'} successfully`);
    } catch (error) {
      console.error('Error updating user block status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleAdd = () => {
    setSelectedProfile(null);
    setFormData({
      full_name: "",
      age: undefined,
      gender: "",
      phone: "",
      bio: "",
      badge: "",
      blocked: false,
    });
    setDialogOpen(true);
  };

  const handleEdit = (profile: Profile) => {
    setSelectedProfile(profile);
    setFormData(profile);
    setDialogOpen(true);
  };

  const handleDelete = (profile: Profile) => {
    setSelectedProfile(profile);
    setDeleteDialogOpen(true);
  };

  const handleBulkBlock = async (items: Profile[], blocked: boolean) => {
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({ blocked })
        .in('id', items.map(item => item.id));

      if (error) throw error;
      
      await fetchProfiles();
      toast.success(`${blocked ? 'Blocked' : 'Unblocked'} ${items.length} users`);
    } catch (error) {
      console.error('Error updating user block status:', error);
      toast.error(`Failed to ${blocked ? 'block' : 'unblock'} users`);
    }
  };

  const handleBulkDelete = async (items: Profile[]) => {
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .delete()
        .in('id', items.map(item => item.id));

      if (error) throw error;
      
      await fetchProfiles();
      toast.success(`Deleted ${items.length} profiles`);
    } catch (error) {
      console.error('Error deleting profiles:', error);
      toast.error('Failed to delete profiles');
    }
  };

  const handleSubmit = async () => {
    try {
      if (selectedProfile) {
        const { error } = await supabaseClient
          .from('profiles')
          .update({
            full_name: formData.full_name,
            age: formData.age,
            gender: formData.gender,
            phone: formData.phone,
            bio: formData.bio,
            badge: formData.badge,
            blocked: formData.blocked
          })
          .eq('id', selectedProfile.id);

        if (error) throw error;
        toast.success("Profile updated successfully");
      } else {
        const { error } = await supabaseClient
          .from('profiles')
          .insert({
            full_name: formData.full_name,
            age: formData.age,
            gender: formData.gender,
            phone: formData.phone,
            bio: formData.bio,
            badge: formData.badge,
            blocked: false
          });

        if (error) throw error;
        toast.success("Profile created successfully");
      }
      
      await fetchProfiles();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedProfile) {
      try {
        const { error } = await supabaseClient
          .from('profiles')
          .delete()
          .eq('id', selectedProfile.id);

        if (error) throw error;
        
        await fetchProfiles();
        toast.success("Profile deleted successfully");
      } catch (error) {
        console.error('Error deleting profile:', error);
        toast.error('Failed to delete profile');
      }
    }
    setDeleteDialogOpen(false);
  };

  const getBulkActions = (items: Profile[]) => [
    {
      label: "Block Selected",
      action: () => handleBulkBlock(items, true),
      variant: "destructive" as const,
    },
    {
      label: "Unblock Selected", 
      action: () => handleBulkBlock(items, false),
      variant: "outline" as const,
    },
  ];

  return (
    <AdminLayout title="Profiles">
      <DataTable
        data={profiles}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRowClick={handleRowClick}
        onBulkDelete={handleBulkDelete}
        onBulkActions={getBulkActions}
        title="Profile"
      />

      <UserDetailDialog
        user={selectedProfile}
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        onBlock={handleBlockUser}
        onUserUpdate={fetchProfiles}
      />

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        title={selectedProfile ? "Edit Profile" : "Add Profile"}
        isEdit={!!selectedProfile}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name || ""}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                min={13}
                max={120}
                value={formData.age || ""}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender || ""}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="badge">Badge</Label>
              <Input
                id="badge"
                value={formData.badge || ""}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio || ""}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      </FormDialog>

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Profile"
        description="Are you sure you want to delete this profile? All associated data will be removed."
      />
    </AdminLayout>
  );
}
