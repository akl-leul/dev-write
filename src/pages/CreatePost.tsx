import { useState, useRef, useEffect } from 'react';
// import { useAuth } from '@/contexts/AuthContext'; // Removed auth dependency
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X, Upload, Loader2, Image as ImageIcon, PenLine, FileText, Globe, MessageCircle, ChevronDown, ChevronUp, Tag as TagIcon, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { MentionOverlay } from '@/components/editor/MentionOverlay';
import { TagMentionOverlay } from '@/components/editor/TagMentionOverlay';
import { useMentions } from '@/hooks/useMentions';
import { useTagMentions } from '@/hooks/useTagMentions';
import { extractMentions, findUsersByNames, extractMentionsFromTags } from '@/utils/userSearch';
import { format } from 'date-fns';

const CreatePost = () => {
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
  const [showComments, setShowComments] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Array<{ id: string; content: string; created_at: string; author: { full_name: string; profile_image_url?: string } }>>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [availableTags, setAvailableTags] = useState<Array<{ id: string; name: string; slug: string; color: string }>>([]);
  
  // Mention functionality
  const editorRef = useRef<HTMLDivElement>(null);
  const { mentionState, checkForMention, insertMention, closeMentions } = useMentions(editorRef);

  // Tag mention functionality
  const tagInputRef = useRef<HTMLInputElement>(null);
  const { 
    mentionState: tagMentionState, 
    searchResults: tagSearchResults, 
    checkForMention: checkTagMentions, 
    insertMention: insertTagMention, 
    closeMentions: closeTagMentions 
  } = useTagMentions(tagInputRef, tagInput);

  // Fetch categories and tags
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

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Update available tags when data changes
  if (tagsData && tagsData !== availableTags) {
    setAvailableTags(tagsData);
  }

  // Add event listeners for TipTap editor mention detection
  useEffect(() => {
    const setupEventListeners = () => {
      const editorElement = editorRef.current?.querySelector('.ProseMirror');
      if (!editorElement) return;

      const handleKeyUp = (e: KeyboardEvent) => {
        checkForMention();
      };

      const handleClick = (e: MouseEvent) => {
        checkForMention();
      };

      const handleInput = (e: InputEvent) => {
        checkForMention();
      };

      // Add event listeners
      editorElement.addEventListener('keyup', handleKeyUp);
      editorElement.addEventListener('click', handleClick);
      editorElement.addEventListener('input', handleInput);

      // Cleanup function
      return () => {
        editorElement.removeEventListener('keyup', handleKeyUp);
        editorElement.removeEventListener('click', handleClick);
        editorElement.removeEventListener('input', handleInput);
      };
    };

    // Try to setup immediately
    const cleanup = setupEventListeners();
    
    // If not ready, set up a MutationObserver to wait for the editor
    if (!cleanup) {
      const observer = new MutationObserver(() => {
        const cleanup = setupEventListeners();
        if (cleanup) {
          observer.disconnect();
        }
      });

      observer.observe(editorRef.current!, {
        childList: true,
        subtree: true,
      });

      // Also try after a delay as fallback
      const timer = setTimeout(() => {
        const cleanup = setupEventListeners();
        if (cleanup) {
          observer.disconnect();
        }
      }, 500);

      return () => {
        observer.disconnect();
        clearTimeout(timer);
      };
    }

    return cleanup;
  }, [checkForMention]);

  // Load existing post if editing
  useQuery({
    queryKey: ['post-edit', editId],
    queryFn: async () => {
      if (!editId) return null;
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', editId)
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
        
        // Load existing tags
        const { data: postTags } = await supabase
          .from('post_tags')
          .select(`
            tags (
              name
            )
          `)
          .eq('post_id', editId);
        
        if (postTags) {
          const tagNames = postTags.map(pt => pt.tags.name);
          setTags(tagNames);
        }
      }
      return data;
    },
    enabled: !!editId,
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
        const fileName = `anonymous/featured/${Date.now()}.${fileExt}`;
        
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
          .eq('id', editId);

        if (updateError) throw updateError;
        
        // Get existing slug for navigation
        const { data: existingPost } = await supabase
          .from('posts')
          .select('slug')
          .eq('id', editId)
          .single();
        
        // Extract mentions from content
        const mentionedNames = extractMentions(content);
        if (mentionedNames.length > 0) {
          const mentionedUsers = await findUsersByNames(mentionedNames);
          const mentionedUserIds = mentionedUsers.map(u => u.id);
        }
        
        // Handle tags for edited post
        if (tags.length > 0) {
          // Remove existing post tags
          await supabase
            .from('post_tags')
            .delete()
            .eq('post_id', editId);
          
          // Create or find tags and associate with post
          const tagPromises = tags.map(async (tagName) => {
            const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            
            // Try to find existing tag
            const { data: existingTag } = await supabase
              .from('tags')
              .select('id')
              .eq('slug', slug)
              .single();
            
            const tagId = existingTag?.id || (
              (await supabase
                .from('tags')
                .insert({ name: tagName, slug })
                .select('id')
                .single())?.data?.id
            );
            
            if (tagId) {
              return supabase
                .from('post_tags')
                .insert({ post_id: editId, tag_id: tagId });
            }
          });
          
          await Promise.all(tagPromises);
          
          // Extract mentions from tags
          const tagMentions = extractMentionsFromTags(tags);
          if (tagMentions.length > 0) {
            const mentionedUsersFromTags = await findUsersByNames(tagMentions);
            const mentionedUserIdsFromTags = mentionedUsersFromTags.map(u => u.id);
          }
        } else {
          // Remove all tags if none are selected
          await supabase
            .from('post_tags')
            .delete()
            .eq('post_id', editId);
        }
        
        return { id: editId, slug: existingPost?.slug };
      }

      // Create slug from title and date
      const slug = generateSlug();

      // Create new post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: 'anonymous',
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

      // Extract mentions from content
      const mentionedNames = extractMentions(content);
      if (mentionedNames.length > 0) {
        const mentionedUsers = await findUsersByNames(mentionedNames);
        const mentionedUserIds = mentionedUsers.map(u => u.id);
      }

      // Upload images
      if (images.length > 0) {
        const imagePromises = images.map(async (file, index) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `anonymous/${post.id}/${Date.now()}-${index}.${fileExt}`;

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

      // Handle tags
      if (tags.length > 0) {
        // Create or find tags
        const tagPromises = tags.map(async (tagName) => {
          const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          
          // Try to find existing tag
          const { data: existingTag } = await supabase
            .from('tags')
            .select('id')
            .eq('slug', slug)
            .single();
          
          if (existingTag) {
            return existingTag.id;
          } else {
            // Create new tag
            const { data: newTag } = await supabase
              .from('tags')
              .insert({ name: tagName, slug })
              .select('id')
              .single();
            return newTag?.id;
          }
        });
        
        const tagIds = await Promise.all(tagPromises);
        
        // Associate tags with post
        const postTagPromises = tagIds.map((tagId) => {
          if (tagId) {
            return supabase
              .from('post_tags')
              .insert({ post_id: post.id, tag_id: tagId });
          }
        });
        
        await Promise.all(postTagPromises);

        // Extract mentions from tags
        const tagMentions = extractMentionsFromTags(tags);
        if (tagMentions.length > 0) {
          const mentionedUsersFromTags = await findUsersByNames(tagMentions);
          const mentionedUserIdsFromTags = mentionedUsersFromTags.map(u => u.id);
        }
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

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    
    const newComment = {
      id: Date.now().toString(),
      content: commentText,
      created_at: new Date().toISOString(),
      author: {
        full_name: 'Anonymous User',
        profile_image_url: ''
      }
    };
    
    setComments([newComment, ...comments]);
    setCommentText('');
    toast.success('Comment added successfully');
  };

  const handleDeleteComment = (commentId: string) => {
    setComments(comments.filter(comment => comment.id !== commentId));
    toast.success('Comment deleted successfully');
  };

  // Tag handling functions
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      const newTags = [...tags, trimmedTag];
      setTags(newTags);
      setTagInput('');
    } else if (tags.length >= 10) {
      toast.error('Maximum 10 tags allowed');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSelectExistingTag = (tagName: string) => {
    if (!tags.includes(tagName) && tags.length < 10) {
      setTags([...tags, tagName]);
      setTagInput('');
    } else if (tags.length >= 10) {
      toast.error('Maximum 10 tags allowed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/20 theme-transition">
      
      {/* Background Dot Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none dark:opacity-20" 
           style={{
             backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
             backgroundSize: '24px 24px'
           }}>
      </div>

      <div className="relative z-10">
        <Header />
        
        <main className="container mx-auto py-12 px-4">
          <div className="max-w-4xl mx-auto">
            
            {/* Header Section */}
            <div className="mb-8 flex items-center gap-3">
              <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 theme-transition">
                <PenLine size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight theme-transition">
                  {editId ? 'Edit Your Story' : 'Write Your Story'}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 theme-transition">Share your thoughts with the world</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Main Metadata Card */}
              <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden theme-transition">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 pb-4 theme-transition">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold theme-transition">
                    <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    Story Details
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-slate-700 dark:text-slate-300 font-medium theme-transition">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Give your story a compelling title..."
                      className="text-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 py-6 theme-transition"
                      required
                    />
                  </div>

                  {/* Slug preview */}
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2 theme-transition">
                      <Globe className="w-3 h-3 text-slate-400 dark:text-slate-500" /> URL Preview
                    </Label>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm theme-transition">
                      <span className="select-none text-slate-400 dark:text-slate-500">chronicle.com/post/</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium truncate ml-1 theme-transition">
                        {title ? generateSlug() : 'dd/mm/yyyy/your-title'}
                      </span>
                    </div>
                  </div>

                  {/* Excerpt */}
                  <div className="space-y-2">
                    <Label htmlFor="excerpt" className="text-slate-700 dark:text-slate-300 font-medium theme-transition">Excerpt</Label>
                    <Textarea
                      id="excerpt"
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      placeholder="Write a brief summary of your post..."
                      className="min-h-[80px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 resize-none theme-transition"
                    />
                    <p className="text-xs text-slate-400 dark:text-slate-500 theme-transition">
                      If left empty, the first 200 characters of content will be used
                    </p>
                  </div>

                  {/* Featured Image */}
                  <div className="space-y-3">
                    <Label className="text-slate-700 dark:text-slate-300 font-medium theme-transition">Featured Image</Label>
                    
                    {featuredImageUrl ? (
                      <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 group theme-transition">
                        <img
                          src={featuredImageUrl}
                          alt="Featured"
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={removeFeaturedImage}
                            className="rounded-full"
                          >
                            <X className="h-4 w-4 mr-2" /> Remove Image
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600 transition-colors theme-transition">
                        <input
                          id="featured-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleFeaturedImageSelect}
                          className="hidden"
                        />
                        <label htmlFor="featured-upload" className="cursor-pointer flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center theme-transition">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 theme-transition">Click to upload cover image</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 theme-transition">SVG, PNG, JPG or GIF (max. 800x400px)</p>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Settings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Category */}
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-slate-700 dark:text-slate-300 font-medium theme-transition">Category</Label>
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 theme-transition">
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
                      <Label htmlFor="readTime" className="text-slate-700 dark:text-slate-300 font-medium theme-transition">Read Time (minutes)</Label>
                      <Input
                        id="readTime"
                        type="number"
                        min={1}
                        max={60}
                        value={readTime}
                        onChange={(e) => setReadTime(parseInt(e.target.value) || 5)}
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 theme-transition"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Editor Section */}
              <div className="space-y-2">
                <Label htmlFor="content" className="text-lg font-bold text-slate-900 dark:text-slate-100 pl-1 theme-transition">Story Content</Label>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm relative theme-transition">
                  <div ref={editorRef}>
                    <RichTextEditor
                      content={content}
                      onChange={setContent}
                      placeholder="Start writing your story here... Type @ to mention someone"
                    />
                  </div>
                  {mentionState.active && mentionState.position && (
                    <MentionOverlay
                      query={mentionState.query}
                      onSelect={insertMention}
                      onClose={closeMentions}
                      position={mentionState.position}
                      editorRef={editorRef}
                    />
                  )}
                </div>
              </div>

              {/* Additional Images Section */}
              <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden theme-transition">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 pb-4 theme-transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold theme-transition">
                      <ImageIcon className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                      Additional Images
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full theme-transition">
                      {images.length}/5
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {images.length < 5 && (
                    <div className="mb-4">
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <label 
                        htmlFor="image-upload" 
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors text-sm shadow-sm theme-transition"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Gallery Images
                      </label>
                    </div>
                  )}

                  {images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {images.map((file, index) => (
                        <div key={index} className="relative group rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm aspect-square theme-transition">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="p-1.5 bg-white text-red-500 rounded-full hover:bg-red-50 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-lg theme-transition">
                      No gallery images added yet
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tags Section */}
              <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden theme-transition">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 pb-4 theme-transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold theme-transition">
                      <TagIcon className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                      Tags
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full theme-transition">
                      {tags.length}/10
                    </span>
                  </div>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400 theme-transition">
                    Add tags to help readers discover your content. Press Enter or comma to add a tag. Type @ to mention a user.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Tag Input */}
                  <div className="flex flex-wrap gap-2 relative">
                    <Input
                      ref={tagInputRef}
                      value={tagInput}
                      onChange={(e) => {
                        setTagInput(e.target.value);
                        checkTagMentions();
                      }}
                      onKeyDown={handleTagInputKeyDown}
                      onFocus={checkTagMentions}
                      placeholder="Add a tag... Type @ to mention a user"
                      className="flex-1 min-w-[200px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 theme-transition"
                    />
                    <Button
                      type="button"
                      onClick={handleAddTag}
                      disabled={!tagInput.trim() || tags.length >= 10}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                    
                    {/* Tag Mention Overlay */}
                    {tagMentionState.active && tagMentionState.position && (
                      <TagMentionOverlay
                        query={tagMentionState.query}
                        searchResults={tagSearchResults}
                        onSelect={insertTagMention}
                        onClose={closeTagMentions}
                        position={tagMentionState.position}
                        inputRef={tagInputRef}
                      />
                    )}
                  </div>

                  {/* Existing Tags Suggestions */}
                  {availableTags.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-600 font-medium">Suggested Tags:</Label>
                      <div className="flex flex-wrap gap-2">
                        {availableTags
                          .filter(tag => !tags.includes(tag.name))
                          .slice(0, 8)
                          .map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => handleSelectExistingTag(tag.name)}
                              className="px-3 py-1 text-xs font-medium rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                              style={{ borderColor: tag.color + '40', color: tag.color }}
                            >
                              {tag.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Selected Tags */}
                  {tags.length > 0 ? (
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-600 font-medium">Selected Tags:</Label>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag, index) => {
                          const tagData = availableTags.find(t => t.name === tag);
                          return (
                            <div
                              key={index}
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-200"
                              style={{ 
                                backgroundColor: tagData?.color + '20' || '#3B82F620',
                                borderColor: tagData?.color + '40' || '#3B82F640',
                                color: tagData?.color || '#3B82F6'
                              }}
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
                      <TagIcon className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                      <p>No tags added yet</p>
                      <p className="text-xs mt-1">Add tags to improve discoverability</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Publication Settings */}
              <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden theme-transition">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-1">
                      <Label className="text-slate-900 dark:text-slate-100 font-semibold theme-transition">Publish Settings</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400 theme-transition">Manage visibility and status</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-6 sm:justify-end">
                       {/* Status Dropdown */}
                       <div className="flex items-center gap-2">
                        <Label htmlFor="status" className="text-slate-600 dark:text-slate-400 text-sm theme-transition">Status:</Label>
                        <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                          <SelectTrigger className="w-[130px] h-9 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 theme-transition">
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
                      <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-700 theme-transition">
                        <Switch
                          checked={isPublished}
                          onCheckedChange={(checked) => {
                            setIsPublished(checked);
                            if (checked) setStatus('published');
                          }}
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 theme-transition">
                          {isPublished ? 'Publish Immediately' : 'Save as Draft'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comments Section */}
              <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden theme-transition">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 theme-transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold theme-transition">
                      <MessageCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
                      Comments Section
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 theme-transition">
                        <Switch
                          checked={commentsEnabled}
                          onCheckedChange={setCommentsEnabled}
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 theme-transition">
                          {commentsEnabled ? 'Comments Enabled' : 'Comments Disabled'}
                        </span>
                      </div>
                      {commentsEnabled && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full theme-transition">
                          {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                        </span>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400 theme-transition">
                    {commentsEnabled 
                      ? 'Readers can comment on this post. Toggle to disable commenting.'
                      : 'Comments are disabled for this post. Toggle to enable commenting.'
                    }
                  </CardDescription>
                </CardHeader>
                
                {commentsEnabled && (
                  <CardContent className="pt-6 space-y-6">
                    {/* Add Comment Form */}
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-bold theme-transition">
                          AU
                        </div>
                        <div className="flex-1">
                          <Textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Share your thoughts about this post..."
                            className="min-h-[80px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 resize-none theme-transition"
                          />
                          <div className="mt-2 flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleAddComment}
                              disabled={!commentText.trim()}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Post Comment
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Comments List */}
                    {comments.length > 0 ? (
                      <div className="space-y-4">
                        {comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg theme-transition">
                            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 text-sm font-bold flex-shrink-0 theme-transition">
                              {comment.author.full_name?.[0]?.toUpperCase() || 'A'}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-900 dark:text-slate-100 text-sm theme-transition">
                                    {comment.author.full_name}
                                  </span>
                                  <span className="text-xs text-slate-400 dark:text-slate-500 theme-transition">
                                    {new Date(comment.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap theme-transition">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-lg theme-transition">
                        No comments yet. Be the first to share your thoughts!
                      </div>
                    )}
                  </CardContent>
                )}
                
                {!commentsEnabled && (
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-lg theme-transition">
                      <MessageCircle className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600 theme-transition" />
                      <p className="font-medium text-slate-600 dark:text-slate-400 mb-1 theme-transition">Comments are disabled</p>
                      <p className="text-slate-500 dark:text-slate-400 theme-transition">The author has disabled commenting for this post.</p>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end pt-4 pb-20">
                <Button
                  type="button"
                  variant="ghost"
                  className="mr-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 theme-transition"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 rounded-xl px-8"
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
              </div>

            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreatePost;