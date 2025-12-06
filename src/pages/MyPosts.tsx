import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Eye, Edit, Trash2, MessageSquare, AlertCircle, FileText, Calendar, PenLine } from 'lucide-react';
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
  post_images: { url: string; order_index: number }[];
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
          post_images(url),
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
      
      if (error) {
        console.error('Query error:', error);
        throw error;
      }
      
      console.log('Posts data:', data);
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

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="h-10 w-48 bg-slate-200 rounded-lg animate-pulse mb-8"></div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm animate-pulse h-40">
                <div className="flex gap-4">
                  <div className="h-24 w-24 bg-slate-200 rounded-xl"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
                    <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
                  </div>
                </div>
              </div>
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
          <div className="max-w-6xl mx-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-blue-600">
                  <FileText size={24} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Posts</h1>
                  <p className="text-slate-500">Manage your stories and community interactions</p>
                </div>
              </div>
              <Link to="/create">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20">
                  <PenLine className="w-4 h-4 mr-2" />
                  Write New Story
                </Button>
              </Link>
            </div>

            {/* Pending Comments Alert Section */}
            {pendingComments.length > 0 && (
              <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
                <Card className="bg-white border-orange-100 shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="bg-orange-50/50 border-b border-orange-100 py-4">
                    <div className="flex items-center gap-2 text-orange-700 font-semibold">
                      <AlertCircle className="w-5 h-5" />
                      Pending Comments
                      <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full ml-1">
                        {pendingComments.length} needs action
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                      {pendingComments.map((comment) => (
                        <div key={comment.id} className="p-6 hover:bg-slate-50 transition-colors">
                          <div className="flex flex-col md:flex-row md:items-start gap-4">
                            <div className="flex items-center gap-3 min-w-[200px]">
                              <Avatar className="h-10 w-10 border border-white shadow-sm">
                                <AvatarImage src={comment.profiles?.profile_image_url || ''} />
                                <AvatarFallback className="bg-slate-100 text-slate-600">
                                  {comment.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-slate-900 text-sm">{comment.profiles?.full_name}</p>
                                <p className="text-xs text-slate-500">
                                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex-1 space-y-2">
                              <Link to={`/post/${comment.postSlug}`} className="text-xs text-blue-600 hover:underline font-medium">
                                On: {comment.postTitle}
                              </Link>
                              <div className="prose prose-sm prose-slate max-w-none text-slate-600 bg-white p-3 rounded-lg border border-slate-100">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {comment.content_markdown}
                                </ReactMarkdown>
                              </div>
                            </div>

                            <div className="flex gap-2 md:flex-col pt-2 md:pt-0">
                              <Button
                                size="sm"
                                onClick={() => approveComment.mutate(comment.id)}
                                className="bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm"
                              >
                                <Check className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (confirm('Reject and delete this comment?')) {
                                    rejectComment.mutate(comment.id);
                                  }
                                }}
                                className="text-red-500 border-red-100 hover:bg-red-50 rounded-lg"
                              >
                                <X className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Posts List */}
            <div className="space-y-6">
              {posts && posts.length > 0 ? (
                posts.map((post) => {
                  const approvedCount = post.comments.filter(c => c.approved).length;
                  const pendingCount = post.comments.filter(c => !c.approved).length;
                  
                  return (
                    <Card key={post.id} className="group bg-white border border-slate-100 shadow-sm hover:shadow-lg hover:border-blue-100 transition-all duration-300 rounded-2xl overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-6">
                          {/* Post Image */}
                          {(() => {
                            console.log('Post images for', post.title, ':', post.post_images);
                            // Find the featured image (order_index = 0) or the first image if no featured image exists
                            const featuredImage = post.post_images?.find(img => img.order_index === 0) || post.post_images?.[0];
                            return featuredImage ? (
                              <div className="w-full md:w-48 h-32 flex-shrink-0 rounded-xl overflow-hidden border border-slate-100">
                                <img
                                  src={featuredImage.url}
                                  alt={post.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  onError={(e) => console.error('Image failed to load:', featuredImage.url)}
                                  onLoad={() => console.log('Image loaded successfully:', featuredImage.url)}
                                />
                              </div>
                            ) : (
                              <div className="w-full flex flex-col md:w-48 h-32 flex-shrink-0 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                                <AlertCircle className="w-10 h-10" /> <p>No featured image</p>
                              </div>
                            );
                          })()}
                          
                          {/* Post Content */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                                  {post.title}
                                </h3>
                                <Badge 
                                  variant="outline" 
                                  className={`rounded-full px-3 py-0.5 border-0 font-medium ${
                                    post.status === 'published' 
                                      ? 'bg-green-50 text-green-700' 
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {post.status === 'published' ? 'Published' : 'Draft'}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>{approvedCount} comments</span>
                                </div>
                                {pendingCount > 0 && (
                                  <span className="text-orange-600 font-medium text-xs bg-orange-50 px-2 py-0.5 rounded-full">
                                    {pendingCount} pending review
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Actions Bar */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-50 mt-2">
                              <Link to={`/post/${post.slug}`}>
                                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                              </Link>
                              <Link to={`/create?edit=${post.id}`}>
                                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                              </Link>
                              <div className="flex-1"></div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
                                    deletePost.mutate(post.id);
                                  }
                                }}
                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card className="border-dashed border-2 border-slate-200 shadow-none bg-slate-50/50 rounded-2xl">
                  <CardContent className="p-16 text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-300">
                      <PenLine className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No stories yet</h3>
                    <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                      You haven't published any stories yet. Share your first thought with the world!
                    </p>
                    <Link to="/create">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 px-8 py-6">
                        Write Your First Story
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MyPosts;