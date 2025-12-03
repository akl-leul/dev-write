import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { format } from 'date-fns';

const CreatePost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('published');
  const [isPublished, setIsPublished] = useState(true);
  const [categoryId, setCategoryId] = useState<string>('');
  const [readTime, setReadTime] = useState(5);
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string>('');
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

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
        setExcerpt(data.excerpt || '');
        setStatus(data.status as 'draft' | 'published' | 'archived');
        setIsPublished(data.status === 'published');
        setCategoryId(data.category_id || '');
        setReadTime(data.read_time || 5);
        setFeaturedImageUrl(data.featured_image || '');
      }
      return data;
    },
    enabled: !!editId && !!user,
  });

  // Generate slug from title and date
  const generateSlug = () => {
    const now = new Date();
    const day = format(now, 'dd');
    const month = format(now, 'MM');
    const year = format(now, 'yyyy');
    const titleSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return `${day}/${month}/${year}/${titleSlug}`;
  };

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

      // Upload featured image if exists
      let uploadedFeaturedImageUrl = featuredImageUrl;
      if (featuredImage) {
        const fileExt = featuredImage.name.split('.').pop();
        const fileName = `${user.id}/featured/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, featuredImage);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);
        
        uploadedFeaturedImageUrl = publicUrl;
      }

      const finalStatus = isPublished ? 'published' : status;
      const finalExcerpt = excerpt.trim() || content.replace(/<[^>]*>/g, '').slice(0, 200);

      // If editing, update existing post
      if (editId) {
        const { error: updateError } = await supabase
          .from('posts')
          .update({
            title,
            content_markdown: content,
            excerpt: finalExcerpt,
            status: finalStatus,
            category_id: categoryId || null,
            read_time: readTime,
            featured_image: uploadedFeaturedImageUrl || null,
          })
          .eq('id', editId)
          .eq('author_id', user.id);

        if (updateError) throw updateError;
        
        // Get existing slug for navigation
        const { data: existingPost } = await supabase
          .from('posts')
          .select('slug')
          .eq('id', editId)
          .single();
        
        return { id: editId, slug: existingPost?.slug };
      }

      // Create slug from title and date
      const slug = generateSlug();

      // Create new post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          title,
          slug,
          content_markdown: content,
          excerpt: finalExcerpt,
          status: finalStatus,
          category_id: categoryId || null,
          read_time: readTime,
          featured_image: uploadedFeaturedImageUrl || null,
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
      navigate(isPublished ? `/post/${post.slug}` : '/my-posts');
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

  const handleFeaturedImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setFeaturedImage(e.target.files[0]);
    setFeaturedImageUrl(URL.createObjectURL(e.target.files[0]));
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const removeFeaturedImage = () => {
    setFeaturedImage(null);
    setFeaturedImageUrl('');
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
      
      <main className="container py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl font-serif">{editId ? 'Edit Your Story' : 'Write Your Story'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your story a compelling title..."
                    className="text-lg sm:text-xl font-serif"
                    required
                  />
                </div>

                {/* Slug preview */}
                <div className="space-y-2">
                  <Label>Slug *</Label>
                  <Input
                    value={title ? generateSlug().split('/').pop() : ''}
                    readOnly
                    className="bg-muted"
                    placeholder="auto-generated-from-title"
                  />
                  <p className="text-xs text-muted-foreground">
                    Full URL: /post/{title ? generateSlug() : 'dd/mm/yyyy/your-title'}
                  </p>
                </div>

                {/* Excerpt */}
                <div className="space-y-2">
                  <Label htmlFor="excerpt">Excerpt *</Label>
                  <Textarea
                    id="excerpt"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Write a brief summary of your post..."
                    className="min-h-[80px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    If left empty, the first 200 characters of content will be used
                  </p>
                </div>

                {/* Featured Image */}
                <div className="space-y-2">
                  <Label>Featured Image</Label>
                  {featuredImageUrl ? (
                    <div className="relative w-full max-w-md">
                      <img
                        src={featuredImageUrl}
                        alt="Featured"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={removeFeaturedImage}
                        className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="featured-upload" className="inline-flex items-center gap-2 px-4 py-2 border border-input rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors">
                        <ImageIcon className="h-4 w-4" />
                        Upload Featured Image
                      </label>
                      <input
                        id="featured-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFeaturedImageSelect}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category">Category ID</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Read Time */}
                  <div className="space-y-2">
                    <Label htmlFor="readTime">Read Time (minutes) *</Label>
                    <Input
                      id="readTime"
                      type="number"
                      min={1}
                      max={60}
                      value={readTime}
                      onChange={(e) => setReadTime(parseInt(e.target.value) || 5)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Status */}
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
                  </div>

                  {/* Published Toggle */}
                  <div className="space-y-2">
                    <Label>Published</Label>
                    <div className="flex items-center gap-3 pt-2">
                      <Switch
                        checked={isPublished}
                        onCheckedChange={(checked) => {
                          setIsPublished(checked);
                          if (checked) setStatus('published');
                        }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {isPublished ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="content">Blog Post Content</Label>
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Tell your story..."
                  />
                </div>

                {/* Additional Images */}
                <div className="space-y-4">
                  <Label>Additional Images (Max 5)</Label>
                  
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