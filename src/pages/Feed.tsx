import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const Feed = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data, error } = await supabase
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
      
      <main className="container py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-serif font-bold mb-2">Discover Stories</h1>
          <p className="text-xl text-muted-foreground mb-12">
            Read and share perspectives from writers around the world
          </p>
          
          <div className="space-y-8">
            {posts?.map((post: any) => (
              <Link key={post.id} to={`/post/${post.slug}`}>
                <Card className="group hover:shadow-lift transition-all duration-300 cursor-pointer">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={post.profiles?.profile_image_url || ''} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {post.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{post.profiles?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    
                    <h2 className="text-3xl font-serif font-bold mb-3 group-hover:text-accent transition-colors">
                      {post.title}
                    </h2>
                    
                    {post.excerpt && (
                      <p className="text-muted-foreground text-lg mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}
                    
                    {post.post_images?.[0] && (
                      <div className="mb-4 rounded-lg overflow-hidden">
                        <img
                          src={post.post_images[0].url}
                          alt={post.title}
                          className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        <span>{post.likes?.[0]?.count || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
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
