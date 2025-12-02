import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

const Feed = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:author_id (full_name, profile_image_url),
          likes (count),
          comments (count),
          post_images (url)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content_markdown.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-2">Discover Stories</h1>
          <p className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-12">
            Read and share perspectives from writers around the world
          </p>

          {searchQuery && (
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Showing results for: <span className="font-semibold text-foreground">{searchQuery}</span>
              </p>
            </div>
          )}
          
          <div className="space-y-6 sm:space-y-8">
            {posts?.map((post: any) => (
              <Link key={post.id} to={`/post/${post.slug}`}>
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
                    
                    <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{post.likes?.[0]?.count || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{post.comments?.[0]?.count || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            
            {posts?.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-xl text-muted-foreground">
                    No posts yet. Be the first to share your story!
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

export default Feed;
