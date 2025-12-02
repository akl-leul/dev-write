import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/editor/RichTextEditor';

const CreatePost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('published');
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Load existing post if editing
  useQuery({
    queryKey: ['post-edit', editId],
    queryFn: async () => {
      if (!editId || !user) return null;
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', editId)
        .eq('author_id', user.id)
        .single();
      
      if (error) throw error;
      if (data) {
        setTitle(data.title);
        setContent(data.content_markdown);
        setStatus(data.status as 'draft' | 'published' | 'archived');
      }
      return data;
    },
    enabled: !!editId && !!user,
  });

  const createPost = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!title.trim() || !content.trim()) {
        throw new Error('Title and content are required');
      }
      if (images.length > 5) {
        throw new Error('Maximum 5 images allowed');
      }

      setUploading(true);

      // If editing, update existing post
      if (editId) {
        const { error: updateError } = await supabase
          .from('posts')
          .update({
            title,
            content_markdown: content,
            excerpt: content.replace(/<[^>]*>/g, '').slice(0, 200),
            status,
          })
          .eq('id', editId)
          .eq('author_id', user.id);

        if (updateError) throw updateError;
        return { id: editId, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-') };
      }

      // Create slug from title
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + `-${Date.now()}`;

      // Create new post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          title,
          slug,
          content_markdown: content,
          excerpt: content.replace(/<[^>]*>/g, '').slice(0, 200),
          status,
        })
        .select()
        .single();

      if (postError) throw postError;

      // Upload images
      if (images.length > 0) {
        const imagePromises = images.map(async (file, index) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${post.id}/${Date.now()}-${index}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('post-images')
            .getPublicUrl(fileName);

          return supabase.from('post_images').insert({
            post_id: post.id,
            url: publicUrl,
            order_index: index,
          });
        });

        await Promise.all(imagePromises);
      }

      return post;
    },
    onSuccess: (post) => {
      toast.success(editId ? 'Post updated successfully' : 'Post created successfully');
      navigate(status === 'published' ? `/post/${post.slug}` : '/my-posts');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create post');
      setUploading(false);
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const newFiles = Array.from(e.target.files);
    const totalImages = images.length + newFiles.length;
    
    if (totalImages > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    
    setImages([...images, ...newFiles]);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPost.mutate();
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container py-12">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-serif">{editId ? 'Edit Your Story' : 'Write Your Story'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your story a compelling title..."
                    className="text-xl sm:text-2xl font-serif"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Only published posts are visible to others
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Tell your story..."
                  />
                </div>

                <div className="space-y-4">
                  <Label>Images (Max 5)</Label>
                  
                  {images.length < 5 && (
                    <div>
                      <label htmlFor="image-upload" className="inline-flex items-center gap-2 px-4 py-2 border border-input rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors">
                        <Upload className="h-4 w-4" />
                        Upload Images
                      </label>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </div>
                  )}

                  {images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {images.map((file, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-accent"
                  disabled={uploading || !title.trim() || !content.trim()}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editId ? 'Updating...' : 'Publishing...'}
                    </>
                  ) : (
                    editId ? 'Update Post' : 'Publish Post'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CreatePost;
