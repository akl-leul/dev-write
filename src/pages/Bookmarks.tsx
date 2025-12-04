import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Eye, Clock, BookmarkX } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const Bookmarks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: bookmarks, isLoading } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
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
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container py-12">
          <div className="max-w-4xl mx-auto space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-8">
                  <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-muted rounded w-full mb-2"></div>
                  <div className="h-4 bg-muted rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container py-6 sm:py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-2">Your Bookmarks</h1>
          <p className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-12">
            Posts you've saved for later
          </p>
          
          <div className="space-y-6 sm:space-y-8">
            {bookmarks?.map((bookmark: any) => {
              const post = bookmark.posts;
              if (!post) return null;
              
              return (
                <Link key={bookmark.id} to={`/post/${post.slug}`}>
                  <Card className="group hover:shadow-lift transition-all duration-300 cursor-pointer">
                    <CardContent className="p-4 sm:p-6 md:p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                          <AvatarImage src={post.profiles?.profile_image_url || ''} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {post.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm sm:text-base">{post.profiles?.full_name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold mb-3 group-hover:text-accent transition-colors">
                        {post.title}
                      </h2>
                      
                      {post.post_images?.[0] && (
                        <div className="mb-4 rounded-lg overflow-hidden">
                          <img
                            src={post.post_images[0].url}
                            alt={post.title}
                            className="w-full h-48 sm:h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      
                      {post.excerpt && (
                        <p className="text-muted-foreground text-sm sm:text-base md:text-lg mb-4 line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}
                      
                      {post.categories && (
                        <span className="inline-block px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium mb-3">
                          {post.categories.name}
                        </span>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>{post.likes?.[0]?.count || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>{post.comments?.[0]?.count || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>{post.views || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>{post.read_time || 5} min</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
            
            {bookmarks?.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookmarkX className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-xl text-muted-foreground">
                    No bookmarks yet. Save posts to read later!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Bookmarks;