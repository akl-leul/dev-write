import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Eye, Edit, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CommentWithProfile {
  id: string;
  content_markdown: string;
  created_at: string;
  approved: boolean;
  profiles: {
    full_name: string;
    profile_image_url: string | null;
  };
}

interface Post {
  id: string;
  title: string;
  slug: string;
  created_at: string;
  status: string;
  comments: CommentWithProfile[];
}

const MyPosts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ['my-posts', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          slug,
          created_at,
          status,
          comments (
            id,
            content_markdown,
            created_at,
            approved,
            profiles:author_id (full_name, profile_image_url)
          )
        `)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Post[];
    },
    enabled: !!user,
  });

  const approveComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('comments')
        .update({ approved: true })
        .eq('id', commentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-posts', user?.id] });
      toast.success('Comment approved');
    },
    onError: () => {
      toast.error('Failed to approve comment');
    },
  });

  const rejectComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-posts', user?.id] });
      toast.success('Comment rejected');
    },
    onError: () => {
      toast.error('Failed to reject comment');
    },
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('author_id', user?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-posts', user?.id] });
      toast.success('Post deleted');
    },
    onError: () => {
      toast.error('Failed to delete post');
    },
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
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-muted rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pendingComments = posts?.flatMap(post => 
    post.comments.filter(c => !c.approved).map(c => ({ ...c, postTitle: post.title, postSlug: post.slug }))
  ) || [];

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl font-serif font-bold mb-2">My Posts</h1>
          <p className="text-xl text-muted-foreground mb-12">
            Manage your posts and moderate comments
          </p>

          {/* Pending Comments Section */}
          {pendingComments.length > 0 && (
            <Card className="mb-8 border-accent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Pending Comments
                  <Badge variant="secondary">{pendingComments.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingComments.map((comment) => (
                  <div key={comment.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={comment.profiles?.profile_image_url || ''} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {comment.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{comment.profiles?.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <Link to={`/post/${comment.postSlug}`}>
                        <Badge variant="outline" className="text-xs">
                          on: {comment.postTitle}
                        </Badge>
                      </Link>
                    </div>
                    
                    <div className="prose prose-sm max-w-none pl-13">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {comment.content_markdown}
                      </ReactMarkdown>
                    </div>
                    
                    <div className="flex gap-2 pl-13">
                      <Button
                        size="sm"
                        onClick={() => approveComment.mutate(comment.id)}
                        className="bg-gradient-accent"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm('Reject and delete this comment?')) {
                            rejectComment.mutate(comment.id);
                          }
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Posts List */}
          <div className="space-y-6">
            <h2 className="text-3xl font-serif font-bold">Your Posts</h2>
            
            {posts && posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post) => {
                  const approvedCount = post.comments.filter(c => c.approved).length;
                  const pendingCount = post.comments.filter(c => !c.approved).length;
                  
                  return (
                    <Card key={post.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-2xl font-serif font-bold">{post.title}</h3>
                              <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                                {post.status}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-4">
                              Created {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">
                                {approvedCount} approved comment{approvedCount !== 1 ? 's' : ''}
                              </span>
                              {pendingCount > 0 && (
                                <Badge variant="secondary">
                                  {pendingCount} pending
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Link to={`/post/${post.slug}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </Link>
                            <Link to={`/create?edit=${post.id}`}>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
                                  deletePost.mutate(post.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-xl text-muted-foreground mb-4">
                    You haven't created any posts yet.
                  </p>
                  <Link to="/create">
                    <Button className="bg-gradient-accent">
                      <Edit className="h-4 w-4 mr-2" />
                      Create Your First Post
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyPosts;
