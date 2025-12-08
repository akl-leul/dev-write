import { useState, useEffect, useRef } from "react";
import { Bell, Search, Settings, User, LogOut, FileText, Users, MessageSquare, ExternalLink, UserPlus, Heart, Bookmark, Eye, AlertCircle, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AdminHeaderProps {
  title: string;
}

export function AdminHeader({ title }: AdminHeaderProps) {
  const { user, profile, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Search function - Comprehensive across entire database
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const supabaseClient = supabase as any;
      const results: any[] = [];
      
      // Search across all major tables
      const tables = [
        { name: 'posts', columns: ['title', 'content', 'slug'], type: 'post' },
        { name: 'profiles', columns: ['full_name', 'email', 'bio'], type: 'user' },
        { name: 'comments', columns: ['content'], type: 'comment' },
        { name: 'categories', columns: ['name', 'description'], type: 'category' },
        { name: 'tags', columns: ['name'], type: 'tag' },
        { name: 'likes', columns: [], type: 'like', joinTable: 'posts', joinColumn: 'title' },
        { name: 'bookmarks', columns: [], type: 'bookmark', joinTable: 'posts', joinColumn: 'title' },
        { name: 'followers', columns: [], type: 'follower', joinTable: 'profiles', joinColumn: 'full_name' },
        { name: 'notifications', columns: ['title', 'message'], type: 'notification' }
      ];

      for (const table of tables) {
        try {
          let queryBuilder = supabaseClient.from(table.name).select('*');
          
          if (table.columns.length > 0) {
            const orConditions = table.columns.map(col => `${col}.ilike.%${query}%`).join(',');
            queryBuilder = queryBuilder.or(orConditions);
          } else if (table.joinTable) {
            // For tables without direct searchable columns, search through joins
            queryBuilder = supabaseClient
              .from(table.name)
              .select(`*, ${table.joinTable}!inner(${table.joinColumn})`)
              .filter(`${table.joinTable}.${table.joinColumn}`, 'ilike', `%${query}%`);
          }
          
          const { data } = await queryBuilder.limit(10);
          
          if (data && data.length > 0) {
            results.push(...data.map(item => ({
              ...item,
              type: table.type,
              tableName: table.name
            })));
          }
        } catch (error) {
          console.warn(`Error searching ${table.name}:`, error);
        }
      }

      // Format results for display
      const formattedResults = results.map(item => {
        switch (item.type) {
          case 'post':
            return {
              ...item,
              displayText: item.title || 'Untitled Post',
              subtitle: `Post • ${new Date(item.created_at).toLocaleDateString()}`
            };
          case 'user':
            return {
              ...item,
              displayText: item.full_name || item.email || 'Unknown User',
              subtitle: `User • ${new Date(item.created_at).toLocaleDateString()}`
            };
          case 'comment':
            return {
              ...item,
              displayText: item.content?.substring(0, 50) + '...' || 'No content',
              subtitle: `Comment • ${new Date(item.created_at).toLocaleDateString()}`
            };
          case 'category':
            return {
              ...item,
              displayText: item.name || 'Unnamed Category',
              subtitle: `Category • ${item.description?.substring(0, 30) || 'No description'}`
            };
          case 'tag':
            return {
              ...item,
              displayText: item.name || 'Unnamed Tag',
              subtitle: 'Tag'
            };
          case 'notification':
            return {
              ...item,
              displayText: item.title || item.message || 'System Notification',
              subtitle: `Notification • ${new Date(item.created_at).toLocaleDateString()}`
            };
          default:
            return {
              ...item,
              displayText: JSON.stringify(item),
              subtitle: `${item.type} • ${new Date(item.created_at).toLocaleDateString()}`
            };
        }
      });

      setSearchResults(formattedResults);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch notifications including new user joins with full details
  const fetchNotifications = async () => {
    try {
      const supabaseClient = supabase as any;
      
      // Get recent notifications with full details
      const { data: systemNotifications } = await supabaseClient
        .from('notifications')
        .select(`
          *,
          profiles!notifications_user_id_fkey (
            id, 
            full_name, 
            email, 
            profile_image_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get recent user registrations with full profile details
      const { data: recentUsers } = await supabaseClient
        .from('profiles')
        .select(`
          *,
          auth.users (
            id,
            email,
            created_at,
            last_sign_in_at,
            email_confirmed_at
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get recent posts with full content and author details
      const { data: recentPosts } = await supabaseClient
        .from('posts')
        .select(`
          *,
          profiles!posts_author_id_fkey (
            id, 
            full_name, 
            email, 
            profile_image_url
          ),
          post_tags (
            tags (
              id, 
              name
            )
          ),
          categories (
            id, 
            name,
            description
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get recent comments with full context
      const { data: recentComments } = await supabaseClient
        .from('comments')
        .select(`
          *,
          profiles!comments_user_id_fkey (
            id, 
            full_name, 
            email, 
            profile_image_url
          ),
          posts!comments_post_id_fkey (
            id, 
            title, 
            slug, 
            content,
            author_id,
            profiles!posts_author_id_fkey (
              full_name
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get recent likes with context
      const { data: recentLikes } = await supabaseClient
        .from('likes')
        .select(`
          *,
          profiles!likes_user_id_fkey (
            id, 
            full_name, 
            email, 
            profile_image_url
          ),
          posts!likes_post_id_fkey (
            id, 
            title, 
            slug,
            author_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get recent bookmarks with context
      const { data: recentBookmarks } = await supabaseClient
        .from('bookmarks')
        .select(`
          *,
          profiles!bookmarks_user_id_fkey (
            id, 
            full_name, 
            email, 
            profile_image_url
          ),
          posts!bookmarks_post_id_fkey (
            id, 
            title, 
            slug,
            author_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get recent followers with full user details
      const { data: recentFollowers } = await supabaseClient
        .from('followers')
        .select(`
          *,
          profiles!followers_follower_id_fkey (
            id, 
            full_name, 
            email, 
            profile_image_url
          ),
          profiles!followers_following_id_fkey (
            id, 
            full_name, 
            email, 
            profile_image_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Combine all notifications with full details
      const allNotifications = [
        ...(systemNotifications || []).map(notif => ({
          ...notif,
          type: 'system',
          title: notif.title || 'System Notification',
          message: notif.message || notif.content || 'System update',
          user: notif.profiles,
          icon: AlertCircle,
          color: 'text-blue-500',
          metadata: {
            type: notif.type,
            priority: notif.priority || 'normal',
            category: notif.category || 'general'
          }
        })),
        ...(recentUsers || []).map(user => ({
          ...user,
          type: 'new_user',
          title: 'New User Joined',
          message: `${user.full_name || user.email} joined the platform`,
          user: user,
          icon: UserPlus,
          color: 'text-green-500',
          created_at: user.created_at,
          metadata: {
            email: user.email,
            phone: user.phone,
            bio: user.bio,
            location: user.location,
            website: user.website,
            emailVerified: user.auth?.email_confirmed_at,
            lastSignIn: user.auth?.last_sign_in_at,
            gender: user.gender,
            age: user.age
          }
        })),
        ...(recentPosts || []).map(post => ({
          ...post,
          type: 'new_post',
          title: 'New Post Published',
          message: `"${post.title}" was published by ${post.profiles?.full_name || 'Unknown Author'}`,
          user: post.profiles,
          icon: FileText,
          color: 'text-purple-500',
          created_at: post.created_at,
          metadata: {
            postId: post.id,
            slug: post.slug,
            content: post.content?.substring(0, 200) + '...',
            wordCount: post.content?.split(' ').length || 0,
            status: post.status,
            viewCount: post.view_count || 0,
            category: post.categories?.name,
            tags: post.post_tags?.map(pt => pt.tags.name).join(', ') || 'none',
            featuredImage: post.featured_image,
            readingTime: Math.ceil((post.content?.split(' ').length || 0) / 200) + ' min'
          }
        })),
        ...(recentComments || []).map(comment => ({
          ...comment,
          type: 'new_comment',
          title: 'New Comment',
          message: `${comment.profiles?.full_name || 'Someone'} commented on "${comment.posts?.title}"`,
          user: comment.profiles,
          icon: MessageSquare,
          color: 'text-orange-500',
          created_at: comment.created_at,
          metadata: {
            commentId: comment.id,
            postId: comment.posts?.id,
            postTitle: comment.posts?.title,
            postSlug: comment.posts?.slug,
            postAuthor: comment.posts?.profiles?.full_name,
            commentContent: comment.content,
            commentLength: comment.content?.length || 0,
            postContent: comment.posts?.content?.substring(0, 100) + '...'
          }
        })),
        ...(recentLikes || []).map(like => ({
          ...like,
          type: 'new_like',
          title: 'Post Liked',
          message: `${like.profiles?.full_name || 'Someone'} liked "${like.posts?.title}"`,
          user: like.profiles,
          icon: Heart,
          color: 'text-pink-500',
          created_at: like.created_at,
          metadata: {
            likeId: like.id,
            postId: like.posts?.id,
            postTitle: like.posts?.title,
            postSlug: like.posts?.slug,
            postAuthorId: like.posts?.author_id
          }
        })),
        ...(recentBookmarks || []).map(bookmark => ({
          ...bookmark,
          type: 'new_bookmark',
          title: 'Post Bookmarked',
          message: `${bookmark.profiles?.full_name || 'Someone'} bookmarked "${bookmark.posts?.title}"`,
          user: bookmark.profiles,
          icon: Bookmark,
          color: 'text-yellow-500',
          created_at: bookmark.created_at,
          metadata: {
            bookmarkId: bookmark.id,
            postId: bookmark.posts?.id,
            postTitle: bookmark.posts?.title,
            postSlug: bookmark.posts?.slug,
            postAuthorId: bookmark.posts?.author_id
          }
        })),
        ...(recentFollowers || []).map(follow => ({
          ...follow,
          type: 'new_follower',
          title: 'New Follower',
          message: `${follow.profiles?.follower_id?.full_name || 'Someone'} started following ${follow.profiles?.following_id?.full_name || 'someone'}`,
          user: follow.profiles?.follower_id,
          icon: Users,
          color: 'text-indigo-500',
          created_at: follow.created_at,
          metadata: {
            followId: follow.id,
            followerId: follow.follower_id,
            followingId: follow.following_id,
            followerName: follow.profiles?.follower_id?.full_name,
            followingName: follow.profiles?.following_id?.full_name,
            followerEmail: follow.profiles?.follower_id?.email,
            followingEmail: follow.profiles?.following_id?.email
          }
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Fetch notifications on mount and periodically
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchResults(true);
      performSearch(searchQuery);
    }
  };

  const handleResultClick = (result: any) => {
    setShowSearchResults(false);
    setSearchQuery('');
    
    switch (result.type) {
      case 'post':
        navigate(`/admin/posts/${result.id}`);
        break;
      case 'user':
        navigate(`/admin/users/${result.id}`);
        break;
      case 'comment':
        navigate(`/admin/comments/${result.id}`);
        break;
      default:
        toast.info('Navigation not available for this item');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth");
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-4">
        <div ref={searchRef} className="relative hidden md:block">
          <form onSubmit={handleSearch}>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search posts, users, comments..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="w-64 pl-9 bg-muted/50 border-transparent focus:border-primary"
            />
          </form>
          
          {/* Search Results Dropdown */}
          {showSearchResults && searchQuery && (
            <div className="absolute top-full mt-2 w-full bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
              {isSearching ? (
                <div className="p-4 text-center text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <div
                      key={`${result.type}-${result.id}-${index}`}
                      className="p-3 hover:bg-muted/50 cursor-pointer border-b border-border/50 last:border-b-0 transition-colors"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-lg mt-0.5">
                          {result.type === 'post' && <FileText className="h-4 w-4 text-blue-500" />}
                          {result.type === 'user' && <Users className="h-4 w-4 text-green-500" />}
                          {result.type === 'comment' && <MessageSquare className="h-4 w-4 text-purple-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {result.displayText}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {result.subtitle}
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      </div>
                    </div>
                  ))}
                  <div className="p-2 border-t border-border/50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/search?q=${encodeURIComponent(searchQuery)}`);
                        setShowSearchResults(false);
                      }}
                      className="w-full text-center text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      View all results
                    </button>
                  </div>
                </div>
              ) : searchQuery ? (
                <div className="p-4 text-center text-muted-foreground">
                  <div className="mb-2">
                    <Search className="h-8 w-8 mx-auto text-muted-foreground/50" />
                  </div>
                  No results found for "{searchQuery}"
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div ref={notificationRef} className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
          
          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute top-full mt-2 w-80 bg-background border border-border rounded-lg shadow-xl z-[9999] max-h-96 overflow-hidden">
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Notifications</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNotifications(notifications.map(n => ({ ...n, read: true })));
                      setUnreadCount(0);
                    }}
                  >
                    Mark all read
                  </Button>
                </div>
              </div>
              
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    No notifications
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notification, index) => {
                    const IconComponent = notification.icon;
                    return (
                      <div
                        key={`${notification.type}-${notification.id || index}`}
                        className={`p-4 hover:bg-muted/50 cursor-pointer border-b border-border/50 last:border-b-0 transition-colors ${
                          !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                        }`}
                        onClick={() => {
                          // Mark as read and navigate if needed
                          if (!notification.read) {
                            setNotifications(prev => 
                              prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
                            );
                            setUnreadCount(prev => Math.max(0, prev - 1));
                          }
                          
                          // Navigate based on notification type
                          switch (notification.type) {
                            case 'new_user':
                              navigate('/admin/profiles');
                              break;
                            case 'new_post':
                              navigate(`/admin/posts/${notification.id}`);
                              break;
                            case 'new_comment':
                              navigate('/admin/comments');
                              break;
                            case 'system':
                              navigate('/admin/notifications');
                              break;
                          }
                          setShowNotifications(false);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 bg-muted rounded-lg mt-0.5 flex-shrink-0`}>
                            <IconComponent className={`h-4 w-4 ${notification.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-sm truncate">
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2"></div>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(notification.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {notifications.length > 0 && (
                <div className="p-2 border-t border-border/50">
                  <button
                    onClick={() => {
                      navigate('/admin/notifications');
                      setShowNotifications(false);
                    }}
                    className="w-full text-center text-sm text-primary hover:text-primary/80 transition-colors py-2"
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <ThemeToggle />

        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 border-l border-border pl-4 cursor-pointer hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.user_metadata?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=admin"} />
                <AvatarFallback>{user?.user_metadata?.full_name?.charAt(0) || "AD"}</AvatarFallback>
              </Avatar>
              <div className="hidden lg:block">
                <p className="text-sm font-medium text-foreground">{user?.user_metadata?.full_name || "Admin User"}</p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
