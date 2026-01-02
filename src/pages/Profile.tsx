import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Camera, Loader2, Lock, User, Mail, Phone, Calendar, UserCircle, ShieldCheck, Users, FileText, Twitter, Facebook, Linkedin, Instagram, Github, Youtube, Globe, Image } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { ImageCropModal } from '@/components/ImageCropModal';
import { ProfileBadge } from '@/components/ProfileBadge';
import { useProfileBadge } from '@/hooks/useProfileBadge';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [selectedBackgroundImage, setSelectedBackgroundImage] = useState<string>('');
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    age: 18,
    gender: '',
    profile_image_url: '',
    phone: '',
    show_phone: false,
    twitter: '',
    facebook: '',
    linkedin: '',
    instagram: '',
    github: '',
    youtube: '',
    website: '',
    background_image_url: '',
    badge: null as string | null,
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Profile query error:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user,
  });

  // Sync form data with profile data when it changes
  useEffect(() => {
    if (profile) {
      const profileData = profile as any; // Type assertion for profile data
      setFormData({
        full_name: profileData.full_name || '',
        bio: profileData.bio || '',
        age: profileData.age || 18,
        gender: profileData.gender || '',
        profile_image_url: profileData.profile_image_url || '',
        phone: profileData.phone || '',
        show_phone: profileData.show_phone || false,
        twitter: profileData.twitter || '',
        facebook: profileData.facebook || '',
        linkedin: profileData.linkedin || '',
        instagram: profileData.instagram || '',
        github: profileData.github || '',
        youtube: profileData.youtube || '',
        website: profileData.website || '',
        background_image_url: profileData.background_image_url || '',
        badge: profileData.badge || null,
      });
    }
  }, [profile]);

  // Fetch stats for current user
  const { data: stats } = useQuery({
    queryKey: ['my-profile-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const [postsCountRes, followersRes, followingRes, postsDataRes] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', user.id),
        supabase.from('followers').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('followers').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
        supabase.from('posts').select('id').eq('author_id', user.id).eq('status', 'published'),
      ]);

      let totalLikes = 0;
      if (postsDataRes.data && postsDataRes.data.length > 0) {
        const postIds = postsDataRes.data.map((p: any) => p.id);
        const { count } = await supabase
          .from('likes')
          .select('id', { count: 'exact', head: true })
          .in('post_id', postIds);
        totalLikes = count || 0;
      }

      return {
        posts: postsCountRes.count || 0,
        followers: followersRes.count || 0,
        following: followingRes.count || 0,
        likes: totalLikes,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get user badge based on stats
  const { badge } = useProfileBadge({
    userId: user?.id || '',
    postsCount: stats?.posts || 0,
    followersCount: stats?.followers || 0,
    likesCount: stats?.likes || 0,
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedImage(event.target.result as string);
        setShowCropModal(true);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleBackgroundImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedBackgroundImage(event.target.result as string);
        handleBackgroundImageUpload(event.target.result as string);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleBackgroundImageUpload = async (imageUrl: string) => {
    if (!user) return;

    setUploadingBackground(true);

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      const fileExt = 'jpg'; // We're saving as JPEG
      const fileName = `${user.id}/background_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      await updateProfile.mutateAsync({ background_image_url: publicUrl });

      URL.revokeObjectURL(imageUrl);

      toast.success('Background image updated successfully');
    } catch (error) {
      console.error('Background upload error:', error);
      toast.error('Failed to upload background image');
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleDeleteBackgroundImage = async () => {
    if (!user || !(profile as any).background_image_url) return;

    try {
      // Delete from database
      await updateProfile.mutateAsync({ background_image_url: '' });

      // Optionally delete from storage (more complex, requires extracting file path)
      // For now just remove reference from database

      toast.success('Background image removed successfully');
    } catch (error) {
      console.error('Background delete error:', error);
      toast.error('Failed to remove background image');
    }
  };

  const handleCroppedImageUpload = async (croppedImageUrl: string) => {
    if (!user) return;

    setUploading(true);

    try {
      // Convert the cropped image URL back to a blob
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();

      const fileExt = 'jpg'; // We're saving as JPEG
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      await updateProfile.mutateAsync({ profile_image_url: publicUrl });

      // Clean up the object URL
      URL.revokeObjectURL(croppedImageUrl);
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <div className="container py-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-slate-900 font-sans selection:bg-accent/20 dark:selection:bg-blue-900/20">

      {/* Background Dot Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none dark:opacity-20"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}>
      </div>

      <div className="relative z-10">
        <Header />

        <main className="container mx-auto py-12 px-4">
          <div className="max-w-3xl mx-auto space-y-8">

            {/* Header Title */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <User size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Profile Settings</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage your personal information and security</p>
              </div>
            </div>
            {/* Stats Card */}
            <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden mb-8">
              <CardContent className="p-6">
                <div className="flex flex-wrap justify-center sm:justify-start gap-8">
                  <Link to={user ? `/author/${user.id}` : '#'} className="text-center hover:opacity-80 transition-opacity">
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats?.posts || 0}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1"><FileText className="w-3 h-3" /> Posts</p>
                  </Link>
                  <Link to={user ? `/author/${user.id}` : '#'} className="text-center hover:opacity-80 transition-opacity">
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats?.followers || 0}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Followers</p>
                  </Link>
                  <Link to={user ? `/author/${user.id}` : '#'} className="text-center hover:opacity-80 transition-opacity">
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats?.following || 0}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Following</p>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Profile Edit Card */}
            <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
              <CardHeader className="border-b border-slate-50 dark:border-slate-800">
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <UserCircle className="w-5 h-5 text-slate-500 dark:text-slate-400" />
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
                          <AvatarImage src={(profile as any)?.profile_image_url || ''} />
                          <AvatarFallback className="bg-slate-100 text-slate-400 text-3xl font-bold">
                            {(profile as any)?.full_name?.[0]?.toUpperCase() || 'U'}
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
                          onChange={handleImageSelect}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Profile Photo</p>
                        {badge && (
                          <ProfileBadge badge={badge} size="sm" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Click the camera icon to upload</p>
                    </div>
                  </div>


                  {/* Background Image Upload Section */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                            <Image className="w-4 h-4 text-slate-500" />
                            Profile Background Image
                          </Label>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Upload a custom background image for your profile</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label htmlFor="background-upload" className="cursor-pointer">
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                              {uploadingBackground ? (
                                <Loader2 className="h-4 w-4 text-slate-600 animate-spin" />
                              ) : (
                                <Image className="h-4 w-4 text-slate-600" />
                              )}
                              <span className="text-sm text-slate-700 font-medium">
                                {uploadingBackground ? 'Uploading...' : (profile as any).background_image_url ? 'Update' : 'Choose Image'}
                              </span>
                            </div>
                            <input
                              id="background-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleBackgroundImageSelect}
                              className="hidden"
                              disabled={uploadingBackground}
                            />
                          </label>

                          {(profile as any).background_image_url && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleDeleteBackgroundImage}
                              className="px-3 py-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Background Image Preview */}
                      {(profile as any).background_image_url && (
                        <div className="relative rounded-lg overflow-hidden border border-slate-200 group">
                          <img
                            src={(profile as any).background_image_url}
                            alt="Profile background"
                            className="w-full h-32 object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          <div className="absolute bottom-2 left-2">
                            <p className="text-xs text-white font-medium">Current background</p>
                          </div>
                          {/* Hover overlay with actions */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <label htmlFor="background-upload-hover" className="cursor-pointer">
                              <div className="flex items-center gap-2 px-3 py-2 bg-white/90 hover:bg-white rounded-lg transition-colors">
                                <Image className="h-4 w-4 text-slate-700" />
                                <span className="text-sm text-slate-700 font-medium">Change</span>
                              </div>
                              <input
                                id="background-upload-hover"
                                type="file"
                                accept="image/*"
                                onChange={handleBackgroundImageSelect}
                                className="hidden"
                                disabled={uploadingBackground}
                              />
                            </label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleDeleteBackgroundImage}
                              className="px-3 py-2 bg-white/90 hover:bg-white border-red-200 text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-slate-700 dark:text-slate-300 font-medium">Full Name</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
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
                        <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                          <Phone className="w-3 h-3 text-slate-400" /> Phone
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="Enter your phone number"
                          className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                        <div className="flex items-center justify-between pt-2">
                          <Label htmlFor="show_phone" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                            Make phone number visible on profile
                          </Label>
                          <Switch
                            id="show_phone"
                            checked={formData.show_phone}
                            onCheckedChange={(checked) => setFormData({ ...formData, show_phone: checked })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-slate-700 dark:text-slate-300 font-medium">Bio</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Tell us a little bit about yourself..."
                        rows={4}
                        className="bg-slate-50 dark:bg-slate-900 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="age" className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-slate-400" /> Age
                        </Label>
                        <Input
                          id="age"
                          type="number"
                          value={formData.age}
                          onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                          className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gender" className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                          <User className="w-3 h-3 text-slate-400" /> Gender
                        </Label>
                        <Input
                          id="gender"
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
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

            {/* Social Media Card */}
            <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
              <CardHeader className="border-b border-slate-50 dark:border-slate-800">
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  Social Media Profiles
                </CardTitle>
                <CardDescription>Add your social media links to connect with your audience.</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="twitter" className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                        <Twitter className="w-3 h-3 text-blue-400" /> Twitter
                      </Label>
                      <Input
                        id="twitter"
                        value={formData.twitter}
                        onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                        placeholder="@username"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="facebook" className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                        <Facebook className="w-3 h-3 text-blue-600" /> Facebook
                      </Label>
                      <Input
                        id="facebook"
                        value={formData.facebook}
                        onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                        placeholder="facebook.com/username"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="linkedin" className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                        <Linkedin className="w-3 h-3 text-blue-700" /> LinkedIn
                      </Label>
                      <Input
                        id="linkedin"
                        value={formData.linkedin}
                        onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                        placeholder="linkedin.com/in/username"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instagram" className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                        <Instagram className="w-3 h-3 text-pink-600" /> Instagram
                      </Label>
                      <Input
                        id="instagram"
                        value={formData.instagram}
                        onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                        placeholder="@username"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="github" className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                        <Github className="w-3 h-3 text-slate-800" /> GitHub
                      </Label>
                      <Input
                        id="github"
                        value={formData.github}
                        onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                        placeholder="github.com/username"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="youtube" className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                        <Youtube className="w-3 h-3 text-red-600" /> YouTube
                      </Label>
                      <Input
                        id="youtube"
                        value={formData.youtube}
                        onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                        placeholder="youtube.com/channel/username"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="website" className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                        <Globe className="w-3 h-3 text-slate-600" /> Website
                      </Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://yourwebsite.com"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      type="submit"
                      className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-600/20 px-8"
                      disabled={updateProfile.isPending}
                    >
                      {updateProfile.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                        </>
                      ) : 'Save Social Media'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Password Update Card */}
            <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                  Security
                </CardTitle>
                <CardDescription>Manage your password and security settings.</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-slate-700 dark:text-slate-300 font-medium">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          placeholder="Min 6 characters"
                          required
                          className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300 font-medium">Confirm New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          placeholder="Confirm new password"
                          required
                          className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      variant="outline"
                      className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl px-6"
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

            {/* Image Crop Modal */}
            <ImageCropModal
              isOpen={showCropModal}
              onClose={() => setShowCropModal(false)}
              onCropComplete={handleCroppedImageUpload}
              imageSrc={selectedImage}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;