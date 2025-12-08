import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  MessageSquare,
  Heart,
  Bookmark,
  Bell,
  Users,
  Ban,
  Shield,
  Calendar,
  Mail,
  Phone,
  Send,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Create untyped client for blocking operations
const supabaseClient = supabase as any;

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

interface UserDetailDialogProps {
  user: Profile | null;
  open: boolean;
  onClose: () => void;
  onBlock: (userId: string, blocked: boolean) => void;
  onUserUpdate?: () => void; // Callback to refresh user data
}

export function UserDetailDialog({
  user,
  open,
  onClose,
  onBlock,
  onUserUpdate,
}) {
  if (!user) return null;

  const isBlocked = user?.blocked || false;

  const [userStats, setUserStats] = useState({
    posts: 0,
    comments: 0,
    likes: 0,
    bookmarks: 0,
    followers: 0,
    following: 0,
    notifications: 0
  });
  const [loading, setLoading] = useState(false);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userComments, setUserComments] = useState<any[]>([]);
  const [userLikes, setUserLikes] = useState<any[]>([]);
  const [userBookmarks, setUserBookmarks] = useState<any[]>([]);
  const [userFollowers, setUserFollowers] = useState<any[]>([]);
  const [userFollowing, setUserFollowing] = useState<any[]>([]);
  const [userNotifications, setUserNotifications] = useState<any[]>([]);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [notificationData, setNotificationData] = useState({
    title: "",
    message: "",
    type: "info",
    isBulk: false
  });
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [unblockConfirmOpen, setUnblockConfirmOpen] = useState(false);

  useEffect(() => {
    if (user && open) {
      fetchUserStats();
    }
  }, [user, open]);

  const fetchUserStats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [
        postsResult, 
        commentsResult, 
        likesResult, 
        bookmarksResult, 
        followersResult, 
        followingResult, 
        notificationsResult,
        postsDataResult,
        commentsDataResult,
        likesDataResult,
        bookmarksDataResult,
        followersDataResult,
        followingDataResult,
        notificationsDataResult
      ] = await Promise.all([
        // Count queries
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', user.id),
        supabase.from('comments').select('id', { count: 'exact', head: true }).eq('author_id', user.id),
        supabase.from('likes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('bookmarks').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('followers').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('followers').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        // Data queries
        supabase.from('posts').select('*').eq('author_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('comments').select('*, posts(title, slug, featured_image, excerpt, content_markdown, views_count)').eq('author_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('likes').select('*, posts(title)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('bookmarks').select('*, posts(title)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('followers').select('*, profiles!followers_following_id_fkey(full_name)').eq('follower_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('followers').select('*, profiles!followers_follower_id_fkey(full_name)').eq('following_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
      ]);

      setUserStats({
        posts: postsResult.count || 0,
        comments: commentsResult.count || 0,
        likes: likesResult.count || 0,
        bookmarks: bookmarksResult.count || 0,
        followers: followersResult.count || 0,
        following: followingResult.count || 0,
        notifications: notificationsResult.count || 0
      });

      setUserPosts(postsDataResult.data || []);
      setUserComments(commentsDataResult.data || []);
      setUserLikes(likesDataResult.data || []);
      setUserBookmarks(bookmarksDataResult.data || []);
      setUserFollowers(followersDataResult.data || []);
      setUserFollowing(followingDataResult.data || []);
      setUserNotifications(notificationsDataResult.data || []);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockToggle = () => {
    if (isBlocked) {
      // Show confirmation dialog for unblocking
      setUnblockConfirmOpen(true);
    } else {
      // Show confirmation dialog for blocking
      setBlockConfirmOpen(true);
    }
  };

  const confirmBlock = async () => {
    try {
      console.log('Confirming block for user:', user.id);
      
      // First update the user's blocked status in database
      await onBlock(user.id, true);
      
      console.log('Block update completed, creating notification...');
      
      // Create notification for blocked user
      const blockNotification = {
        user_id: user.id,
        title: "Account Blocked",
        message: "Your account has been blocked. To resolve this issue, please contact our support team at chronicle.ethiopia@gmail.com with your account details and the reason for this block.",
        type: "system",
        read: false
      };

      const { error: notificationError } = await (supabaseAdmin as any)
        .from('notifications')
        .insert(blockNotification);

      if (notificationError) {
        console.error('Error creating block notification:', notificationError);
        toast.error("User blocked but notification failed to send");
      } else {
        console.log('Notification created successfully');
        toast.success("User blocked and notified - they can view details on their Notifications page");
      }

      // Force refresh user data immediately
      await onUserUpdate?.();
      
      // Close dialog and force UI update
      setBlockConfirmOpen(false);
      
      // Small delay to ensure database update is reflected
      setTimeout(() => {
        onUserUpdate?.();
      }, 100);
      
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error("Failed to block user");
    }
  };

  const confirmUnblock = async () => {
    try {
      // First update the user's blocked status in database
      await onBlock(user.id, false);
      
      // Create notification for unblocked user
      const unblockNotification = {
        user_id: user.id,
        title: "Account Unblocked",
        message: "Your account has been unblocked. You can now access your account and use all features normally. Welcome back!",
        type: "system",
        read: false
      };

      const { error: notificationError } = await (supabaseAdmin as any)
        .from('notifications')
        .insert(unblockNotification);

      if (notificationError) {
        console.error('Error creating unblock notification:', notificationError);
        toast.error("User unblocked but notification failed to send");
      } else {
        toast.success("User unblocked and notified - they can view details on their Notifications page");
      }

      // Force refresh user data immediately
      await onUserUpdate?.();
      
      // Close dialog and force UI update
      setUnblockConfirmOpen(false);
      
      // Small delay to ensure database update is reflected
      setTimeout(() => {
        onUserUpdate?.();
      }, 100);
      
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error("Failed to unblock user");
    }
  };

  const handleSendNotification = async () => {
    if (!notificationData.title || !notificationData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (notificationData.isBulk) {
        // Send to all users using service role key
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name')
          .returns<{ id: string; full_name: string }[]>();
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }
        
        if (profiles && profiles.length > 0) {
          const notifications = profiles.map(profile => ({
            user_id: profile.id,
            title: notificationData.title,
            message: notificationData.message,
            type: notificationData.type,
            read: false
          })) as Database['public']['Tables']['notifications']['Insert'][];

          console.log('Sending bulk notifications to:', notifications.length, 'users');
          console.log('Sample notification:', notifications[0]);

          const { error } = await (supabaseAdmin as any)
            .from('notifications')
            .insert(notifications);
          
          if (error) {
            console.error('Bulk notification error:', error);
            throw error;
          }
          
          toast.success(`Bulk notification sent to ${profiles.length} users`);
        } else {
          toast.info('No users found to send notifications to');
        }
      } else {
        // Send to specific user using admin client
        console.log('Sending notification to user:', user.id, user.full_name);
        
        // Create a more descriptive notification for admin messages
        const notificationTitle = notificationData.type === 'system' 
          ? 'System Notification' 
          : notificationData.type === 'info'
          ? 'Admin Announcement'
          : notificationData.title;

        const notificationMessage = notificationData.type === 'system'
          ? `${notificationData.message}\n\n- Sent by Admin`
          : notificationData.message;

        const notificationDataToInsert = {
          user_id: user.id,
          title: notificationTitle,
          message: notificationMessage,
          type: notificationData.type,
          read: false
        } as Database['public']['Tables']['notifications']['Insert'];

        console.log('Notification data:', notificationDataToInsert);

        const { error } = await (supabaseAdmin as any)
          .from('notifications')
          .insert(notificationDataToInsert);
        
        if (error) {
          console.error('Single notification error:', error);
          throw error;
        }
        
        toast.success(`Notification sent to ${user.full_name}`);
      }

      // Reset form and close dialog
      setNotificationData({
        title: "",
        message: "",
        type: "info",
        isBulk: false
      });
      setNotificationDialogOpen(false);
      
      // Refresh notifications
      await fetchUserStats();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error(`Failed to send notification: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>

        {/* User Header */}
        <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/30">
          <Avatar className="h-16 w-16">
            <AvatarImage
              src={
                user.profile_image_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.full_name}`
              }
            />
            <AvatarFallback className="text-xl">
              {user.full_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold">{user.full_name}</h3>
              {user.badge && (
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  {user.badge}
                </Badge>
              )}
              {isBlocked && (
                <Badge variant="destructive">Blocked</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{user.bio || "No bio"}</p>
            
            {/* Blocked User Alert */}
            {isBlocked && (
              <Alert className="mt-3 border-orange-200 bg-orange-50">
                <Lock className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Account Blocked</strong><br />
                  This user's account has been blocked. They have been notified and can view the full details on their Notifications page, which includes contact information for support.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
              {user.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" /> {user.phone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Joined{" "}
                {new Date(user.created_at).toLocaleDateString()}
              </span>
              {user.age && <span>Age: {user.age}</span>}
              {user.gender && <span>{user.gender}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNotificationDialogOpen(true)}
              className="gap-2"
            >
              <Send className="h-4 w-4" /> Send Notification
            </Button>
            <Button
              variant={isBlocked ? "outline" : "destructive"}
              size="sm"
              onClick={handleBlockToggle}
              className="gap-2"
            >
              {isBlocked ? (
                <>
                  <Shield className="h-4 w-4" /> Unblock
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4" /> Block User
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-6 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{userStats.posts}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{userStats.comments}</p>
            <p className="text-xs text-muted-foreground">Comments</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{userStats.likes}</p>
            <p className="text-xs text-muted-foreground">Likes</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{userStats.bookmarks}</p>
            <p className="text-xs text-muted-foreground">Bookmarks</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{userStats.followers}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{userStats.following}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </div>

        {/* Activity Tabs */}
        <Tabs defaultValue="posts" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="posts" className="text-xs gap-1">
              <FileText className="h-3 w-3" /> Posts
            </TabsTrigger>
            <TabsTrigger value="comments" className="text-xs gap-1">
              <MessageSquare className="h-3 w-3" /> Comments
            </TabsTrigger>
            <TabsTrigger value="likes" className="text-xs gap-1">
              <Heart className="h-3 w-3" /> Likes
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="text-xs gap-1">
              <Bookmark className="h-3 w-3" /> Bookmarks
            </TabsTrigger>
            <TabsTrigger value="follows" className="text-xs gap-1">
              <Users className="h-3 w-3" /> Follows
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs gap-1">
              <Bell className="h-3 w-3" /> Notifs
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4 h-[500px] w-full">
            <div className="p-1">
              <TabsContent value="posts" className="m-0 space-y-3">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : userPosts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No posts</p>
              ) : (
                userPosts.map((post) => (
                  <a 
                    key={post.id} 
                    href={`https://dev-write.vercel.app/post/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        {post.featured_image ? (
                          <img 
                            src={post.featured_image} 
                            alt={post.title}
                            className="w-20 h-20 object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                              if (placeholder) placeholder.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-20 h-20 bg-muted rounded-lg flex items-center justify-center text-muted-foreground ${post.featured_image ? 'hidden' : ''}`}>
                          <FileText className="w-8 h-8" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{post.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {post.excerpt || post.content_markdown?.substring(0, 100)}...
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                            {post.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                          {post.views_count > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {post.views_count} views
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                ))
              )}
            </TabsContent>

            <TabsContent value="comments" className="m-0 space-y-3">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : userComments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No comments</p>
              ) : (
                userComments.map((comment) => (
                  <a 
                    key={comment.id} 
                    href={`https://dev-write.vercel.app/post/${comment.posts?.slug || comment.post_id}#comment-${comment.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        {comment.posts?.featured_image ? (
                          <img 
                            src={comment.posts.featured_image} 
                            alt={comment.posts?.title || "Unknown Post"}
                            className="w-20 h-20 object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                              if (placeholder) placeholder.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-20 h-20 bg-muted rounded-lg flex items-center justify-center text-muted-foreground ${comment.posts?.featured_image ? 'hidden' : ''}`}>
                          <MessageSquare className="w-8 h-8" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">Comment on: {comment.posts?.title || "Unknown Post"}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {comment.content_markdown?.substring(0, 100)}...
                        </p>
                        <div className="flex items-center gap-2 mt-2">
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
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                          {comment.posts?.views_count > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {comment.posts.views_count} views
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                ))
              )}
            </TabsContent>

            <TabsContent value="likes" className="m-0">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : userLikes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No likes</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Post</th>
                        <th className="text-left p-2 font-medium">Title</th>
                        <th className="text-left p-2 font-medium">Liked Date</th>
                        <th className="text-left p-2 font-medium">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userLikes.map((like) => (
                        <tr key={like.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              {like.posts?.featured_image ? (
                                <img 
                                  src={like.posts.featured_image} 
                                  alt={like.posts?.title || "Post"}
                                  className="w-12 h-12 object-cover rounded"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <Heart className={`w-6 h-6 text-muted-foreground ${like.posts?.featured_image ? 'hidden' : ''}`} />
                            </div>
                          </td>
                          <td className="p-2">
                            <a 
                              href={`https://dev-write.vercel.app/post/${like.posts?.slug || like.post_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-medium"
                            >
                              {like.posts?.title || "Unknown Post"}
                            </a>
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {new Date(like.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {like.posts?.views_count || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="bookmarks" className="m-0">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : userBookmarks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No bookmarks</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Post</th>
                        <th className="text-left p-2 font-medium">Title</th>
                        <th className="text-left p-2 font-medium">Bookmarked Date</th>
                        <th className="text-left p-2 font-medium">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userBookmarks.map((bookmark) => (
                        <tr key={bookmark.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              {bookmark.posts?.featured_image ? (
                                <img 
                                  src={bookmark.posts.featured_image} 
                                  alt={bookmark.posts?.title || "Post"}
                                  className="w-12 h-12 object-cover rounded"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <Bookmark className={`w-6 h-6 text-muted-foreground ${bookmark.posts?.featured_image ? 'hidden' : ''}`} />
                            </div>
                          </td>
                          <td className="p-2">
                            <a 
                              href={`https://dev-write.vercel.app/post/${bookmark.posts?.slug || bookmark.post_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-medium"
                            >
                              {bookmark.posts?.title || "Unknown Post"}
                            </a>
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {new Date(bookmark.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {bookmark.posts?.views_count || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="follows" className="m-0 space-y-4">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Followers ({userFollowers.length})</h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {userFollowers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No followers</p>
                      ) : (
                        userFollowers.map((f) => (
                          <div key={f.id} className="p-2 rounded border text-sm bg-card">
                            <p className="font-medium">{f.profiles?.full_name || "Unknown User"}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(f.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Following ({userFollowing.length})</h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {userFollowing.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Not following anyone</p>
                      ) : (
                        userFollowing.map((f) => (
                          <div key={f.id} className="p-2 rounded border text-sm bg-card">
                            <p className="font-medium">{f.profiles?.full_name || "Unknown User"}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(f.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notifications" className="m-0 space-y-3">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : userNotifications.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No notifications</p>
              ) : (
                userNotifications.map((notif) => (
                  <div key={notif.id} className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          notif.type === 'info' ? 'bg-blue-100 text-blue-600' :
                          notif.type === 'like' ? 'bg-red-100 text-red-600' :
                          notif.type === 'comment' ? 'bg-green-100 text-green-600' :
                          notif.type === 'follow' ? 'bg-purple-100 text-purple-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {notif.type === 'info' && <Bell className="w-5 h-5" />}
                          {notif.type === 'like' && <Heart className="w-5 h-5" />}
                          {notif.type === 'comment' && <MessageSquare className="w-5 h-5" />}
                          {notif.type === 'follow' && <Users className="w-5 h-5" />}
                          {!['info', 'like', 'comment', 'follow'].includes(notif.type) && <Bell className="w-5 h-5" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant="outline" 
                            className={
                              notif.type === 'info' ? 'bg-blue-10 text-blue border-blue/20' :
                              notif.type === 'like' ? 'bg-red-10 text-red border-red/20' :
                              notif.type === 'comment' ? 'bg-green-10 text-green border-green/20' :
                              notif.type === 'follow' ? 'bg-purple-10 text-purple border-purple/20' :
                              'bg-gray-10 text-gray border-gray/20'
                            }
                          >
                            {notif.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(notif.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {notif.title && notif.title !== notif.message && (
                          <h4 className="font-medium text-sm truncate mb-1">{notif.title}</h4>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
      
      {/* Notification Dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notification-type">Type</Label>
              <Select
                value={notificationData.type}
                onValueChange={(value) => setNotificationData({ ...notificationData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="like">Like</SelectItem>
                  <SelectItem value="comment">Comment</SelectItem>
                  <SelectItem value="follow">Follow</SelectItem>
                  <SelectItem value="mention">Mention</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notification-title">Title</Label>
              <Input
                id="notification-title"
                value={notificationData.title}
                onChange={(e) => setNotificationData({ ...notificationData, title: e.target.value })}
                placeholder="Enter notification title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notification-message">Message</Label>
              <Textarea
                id="notification-message"
                value={notificationData.message}
                onChange={(e) => setNotificationData({ ...notificationData, message: e.target.value })}
                placeholder="Enter notification message"
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="bulk-notification"
                checked={notificationData.isBulk}
                onChange={(e) => setNotificationData({ ...notificationData, isBulk: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="bulk-notification" className="text-sm">
                Send to all users (bulk notification)
              </Label>
            </div>
            
            {!notificationData.isBulk && user && (
              <div className="p-2 bg-muted rounded text-sm">
                <strong>Recipient:</strong> {user.full_name}
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setNotificationDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendNotification}
                className="flex-1 gap-2"
                disabled={!notificationData.title || !notificationData.message}
              >
                <Send className="h-4 w-4" />
                {notificationData.isBulk ? "Send Bulk" : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unblock Confirmation Dialog */}
      <Dialog open={unblockConfirmOpen} onOpenChange={setUnblockConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Shield className="h-5 w-5" />
              Confirm Unblock User
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <Shield className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Are you sure you want to unblock <strong>{user?.full_name}</strong>?
              </AlertDescription>
            </Alert>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Unblocking this user will:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Restore their full account access</li>
                <li>Allow them to post content again</li>
                <li>Send them a notification about the unblock</li>
              </ul>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setUnblockConfirmOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={confirmUnblock}
                className="flex-1 gap-2"
              >
                <Shield className="h-4 w-4" />
                Unblock User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Confirmation Dialog */}
      <Dialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Block User
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <Ban className="h-4 w-4" />
              <AlertDescription>
                Are you sure you want to block <strong>{user?.full_name}</strong>?
              </AlertDescription>
            </Alert>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Blocking this user will:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Prevent them from accessing their account</li>
                <li>Restrict their ability to post content</li>
                <li>Send them a notification to contact support</li>
              </ul>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setBlockConfirmOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmBlock}
                className="flex-1 gap-2"
              >
                <Ban className="h-4 w-4" />
                Block User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
