import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Eye, Clock, BookmarkX, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const Bookmarks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: bookmarks, isLoading } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        const { data, error } = await supabase
          .from('bookmarks')
          .select(`
            id,
            created_at,
            posts (
              *,
              profiles:author_id (full_name, profile_image_url),
              likes (count),
              comments (count),
              post_images (url),
              categories:category_id (name, slug)
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100); // Limit to prevent huge queries
        
        if (error) {
          // Handle table not existing or permission errors gracefully
          if (error.code === 'PGRST116' || error.code === '42501' || error.code === '400') {
            console.warn('Bookmarks table not available:', error.message);
            return [];
          }
          throw error;
        }
        return data || [];
      } catch (error) {
        console.warn('Failed to load bookmarks:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  if (!user) {
    navigate('/auth');
    return null;
  }

  // Loading State with matching aesthetics
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="h-10 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-8"></div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm animate-pulse h-64">
                <div className="flex gap-4 items-center mb-6">
                  <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="h-8 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/20">
      
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
          <div className="max-w-4xl mx-auto">
            
            {/* Page Header */}
            <div className="mb-10 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4 tracking-tight">
                Your Bookmarks
              </h1>
              <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl">
                A collection of stories you've saved for later inspiration.
              </p>
            </div>
            
            <div className="space-y-8">
              {bookmarks?.map((bookmark: any) => {
                const post = bookmark.posts;
                if (!post) return null;
                
                return (
                  <Link key={bookmark.id} to={`/post/${post.slug}`} className="block group">
                    <article className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-100 dark:hover:border-blue-900/50 transition-all duration-300 relative overflow-hidden">
                      
                      {/* Top Meta: Author & Category */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-900 shadow-sm">
                            <AvatarImage src={post.profiles?.profile_image_url || ''} />
                            <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                              {post.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{post.profiles?.full_name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        
                        {post.categories && (
                          <span className="hidden sm:inline-block px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700 rounded-full text-xs font-semibold tracking-wide">
                            {post.categories.name}
                          </span>
                        )}
                      </div>

                      {/* Main Content Grid */}
                      <div className="grid md:grid-cols-[1fr_200px] gap-6">
                        <div>
                          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                            {post.title}
                          </h2>
                          
                          {post.excerpt && (
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6 line-clamp-3">
                              {post.excerpt}
                            </p>
                          )}

                          {/* Mobile Category Badge */}
                          {post.categories && (
                            <span className="sm:hidden inline-block mb-4 px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium">
                              {post.categories.name}
                            </span>
                          )}

                          {/* Footer Stats */}
                          <div className="flex flex-wrap items-center gap-6 mt-auto pt-2">
                            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-sm font-medium group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                              <Heart className="h-4 w-4" />
                              <span>{post.likes?.[0]?.count || 0}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-sm font-medium group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                              <MessageCircle className="h-4 w-4" />
                              <span>{post.comments?.[0]?.count || 0}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-sm font-medium group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                              <Eye className="h-4 w-4" />
                              <span>{post.views || 0}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400 text-xs font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md ml-auto sm:ml-0">
                              <Clock className="h-3 w-3" />
                              <span>{post.read_time || 5} min read</span>
                            </div>
                          </div>
                        </div>

                        {/* Right Side Image */}
                        {(post.featured_image || post.post_images?.[0]) && (
                          <div className="hidden md:block w-full h-28 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                            <img 
                              src={post.featured_image || post.post_images[0].url} 
                              alt={post.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            />
                          </div>
                        )}
                        
                        {/* Mobile Image */}
                        {(post.featured_image || post.post_images?.[0]) && (
                          <div className="md:hidden w-full h-40 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 mb-4 order-first">
                            <img 
                              src={post.featured_image || post.post_images[0].url} 
                              alt={post.title} 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        )}
                      </div>
                    </article>
                  </Link>
                );
              })}
              
              {bookmarks?.length === 0 && (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 border-dashed shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-500">
                    <BookmarkX className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No bookmarks yet</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    When you see a story you like, click the bookmark icon to save it here for later reading.
                  </p>
                  <Link to="/feed" className="inline-block mt-6 px-6 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    Explore Stories
                  </Link>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Bookmarks;