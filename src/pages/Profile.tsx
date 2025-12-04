import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2, Lock, User, Mail, Phone, Calendar, UserCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    age: 18,
    gender: '',
    profile_image_url: '',
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) {
        navigate('/auth');
        return null;
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setFormData({
          full_name: data.full_name || '',
          bio: data.bio || '',
          age: data.age || 18,
          gender: data.gender || '',
          profile_image_url: data.profile_image_url || '',
        });
      }
      return data;
    },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<typeof formData>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Profile updated successfully');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });

  const updatePassword = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      
      if (passwordData.newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setPasswordData({ newPassword: '', confirmPassword: '' });
      toast.success('Password updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update password');
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Math.random()}.${fileExt}`;
    
    setUploading(true);
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);
      
      await updateProfile.mutateAsync({ profile_image_url: publicUrl });
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(formData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePassword.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="container py-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100">
      
      {/* Background Dot Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none" 
           style={{
             backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
             backgroundSize: '24px 24px'
           }}>
      </div>

      <div className="relative z-10">
        <Header />
        
        <main className="container mx-auto py-12 px-4">
          <div className="max-w-3xl mx-auto space-y-8">
            
            {/* Header Title */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-blue-600">
                <User size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Profile Settings</h1>
                <p className="text-slate-500">Manage your personal information and security</p>
              </div>
            </div>

            {/* Profile Edit Card */}
            <Card className="bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
              <CardHeader className="border-b border-slate-50">
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <UserCircle className="w-5 h-5 text-slate-500" />
                  Personal Information
                </CardTitle>
                <CardDescription>Update your photo and personal details here.</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  
                  {/* Avatar Upload Section */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                      <div className="p-1 bg-white rounded-full shadow-sm border border-slate-100">
                        <Avatar className="h-32 w-32 border-4 border-slate-50">
                          <AvatarImage src={profile?.profile_image_url || ''} />
                          <AvatarFallback className="bg-slate-100 text-slate-400 text-3xl font-bold">
                            {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <label htmlFor="avatar-upload" className="absolute bottom-2 right-2 p-2.5 bg-blue-600 rounded-full cursor-pointer hover:bg-blue-700 transition-all shadow-lg ring-4 ring-white group-hover:scale-105">
                        {uploading ? (
                          <Loader2 className="h-4 w-4 text-white animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4 text-white" />
                        )}
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-900">Profile Photo</p>
                      <p className="text-xs text-slate-500">Click the camera icon to upload</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-slate-700 font-medium">Full Name</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-700 font-medium flex items-center gap-2">
                          <Mail className="w-3 h-3 text-slate-400" /> Email
                        </Label>
                        <Input
                          id="email"
                          value={user?.email || ''}
                          disabled
                          className="bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-slate-700 font-medium flex items-center gap-2">
                          <Phone className="w-3 h-3 text-slate-400" /> Phone
                        </Label>
                        <Input
                          id="phone"
                          value={profile?.phone || 'Not provided'}
                          disabled
                          className="bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-slate-700 font-medium">Bio</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Tell us a little bit about yourself..."
                        rows={4}
                        className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="age" className="text-slate-700 font-medium flex items-center gap-2">
                           <Calendar className="w-3 h-3 text-slate-400" /> Age
                        </Label>
                        <Input
                          id="age"
                          type="number"
                          value={formData.age}
                          onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                          className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gender" className="text-slate-700 font-medium flex items-center gap-2">
                           <User className="w-3 h-3 text-slate-400" /> Gender
                        </Label>
                        <Input
                          id="gender"
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 px-8"
                      disabled={updateProfile.isPending}
                    >
                      {updateProfile.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                        </>
                      ) : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Password Update Card */}
            <Card className="bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50">
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-slate-500" />
                  Security
                </CardTitle>
                <CardDescription>Manage your password and security settings.</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-slate-700 font-medium">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          placeholder="Min 6 characters"
                          required
                          className="pl-10 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">Confirm New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          placeholder="Confirm new password"
                          required
                          className="pl-10 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      variant="outline"
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl px-6"
                      disabled={updatePassword.isPending || !passwordData.newPassword || !passwordData.confirmPassword}
                    >
                      {updatePassword.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                        </>
                      ) : 'Update Password'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;