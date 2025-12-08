import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  X,
  Upload,
  Loader2,
  Image as ImageIcon,
  PenLine,
  FileText,
  Globe,
  MessageCircle,
  Tag as TagIcon,
  Plus
} from 'lucide-react'
import { toast } from 'sonner'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { MentionOverlay } from '@/components/editor/MentionOverlay'
import { TagMentionOverlay } from '@/components/editor/TagMentionOverlay'
import { useMentions } from '@/hooks/useMentions'
import { useTagMentions } from '@/hooks/useTagMentions'
import { extractMentions, findUsersByNames } from '@/utils/userSearch'
import { format } from 'date-fns'

const CreatePost = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')

  // State
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('') // Store plain text for editing
  const [status, setStatus] = useState('published')
  const [isPublished, setIsPublished] = useState(true)
  const [categoryId, setCategoryId] = useState('')
  const [readTime, setReadTime] = useState(5)
  const [featuredImage, setFeaturedImage] = useState(null)
  const [featuredImageUrl, setFeaturedImageUrl] = useState('')
  const [images, setImages] = useState<Array<File | { url: string; id?: string }>>([]) // Can be File objects (new) or URL objects (existing)
  const [imagePreviews, setImagePreviews] = useState<string[]>([]) // Preview URLs for File objects
  const [uploading, setUploading] = useState(false)
  const [commentsEnabled, setCommentsEnabled] = useState(true)
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [availableTags, setAvailableTags] = useState([])

  // Refs
  const editorRef = useRef<any>(null)
  const editorInstanceRef = useRef<any>(null)
  const tagInputRef = useRef(null)

  // Mentions
  const {
    mentionState,
    checkForMention,
    insertMention,
    closeMentions
  } = useMentions(editorInstanceRef)

  const {
    mentionState: tagMentionState,
    searchResults: tagSearchResults,
    checkForMention: checkTagMentions,
    insertMention: insertTagMention,
    closeMentions: closeTagMentions
  } = useTagMentions(tagInputRef, tagInput, setTagInput)

  // Categories query
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    }
  })

  // Tags query
  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    }
  })

  // Update available tags
  useEffect(() => {
    if (tagsData && tagsData.length > 0 && !availableTags.length) {
      setAvailableTags(tagsData)
    }
  }, [tagsData])

  // Editor mention detection - listen to TipTap editor updates
  useEffect(() => {
    if (!editorInstanceRef.current) return;

    const editor = editorInstanceRef.current;
    
    // Use TipTap's transaction system to detect mentions
    const handleUpdate = () => {
      // Small delay to ensure editor state is updated
      setTimeout(() => {
        checkForMention();
      }, 0);
    };

    // Listen to editor updates and selection changes
    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
    };
  }, [checkForMention])

  // Load existing post if editing
  const { isLoading: isLoadingPost } = useQuery({
    queryKey: ['post-edit', editId],
    queryFn: async () => {
      if (!editId) return null

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          category_id,
          post_tags(*, tags(name,slug)),
          post_images(url)
        `)
        .eq('id', editId)
        .single()

      if (error) throw error

      if (data) {
        const postData = data as any; // Type assertion for post data
        // Set all form fields
        setTitle(postData.title || '')
        setContent(postData.content_markdown || '')
        // Strip HTML tags from excerpt for display in textarea
        const excerptText = postData.excerpt ? postData.excerpt.replace(/<[^>]*>/g, '') : ''
        setExcerpt(excerptText)
        setStatus(postData.status || 'draft')
        setIsPublished(postData.status === 'published')
        setCategoryId(postData.category_id || '')
        setReadTime(postData.read_time || 5)
        setFeaturedImageUrl(postData.featured_image || '')
        setCommentsEnabled(postData.comments_enabled !== false)

        // Load existing post_images
        if (postData.post_images && Array.isArray(postData.post_images) && postData.post_images.length > 0) {
          const existingImages = (postData.post_images as any[]).map((img: any) => ({
            url: img.url || '',
            id: img.id
          }))
          setImages(existingImages)
          setImagePreviews([]) // No previews for existing images
        } else {
          setImages([])
          setImagePreviews([])
        }

        // Load existing tags
        if (postData.post_tags && Array.isArray(postData.post_tags) && postData.post_tags.length > 0) {
          const tagNames = postData.post_tags
            .map((pt: any) => pt.tags?.name)
            .filter((name: string) => name)
          setTags(tagNames)
        } else {
          setTags([])
        }
      }

      return data
    },
    enabled: !!editId,
    staleTime: 5 * 60 * 1000, // 5 minutes - edit data doesn't change often
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => URL.revokeObjectURL(preview))
    }
  }, [imagePreviews])

  const generateSlug = () => {
    const now = new Date()
    const day = format(now, 'dd')
    const month = format(now, 'MM')
    const year = format(now, 'yyyy')
    const titleSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
    return `${day}/${month}/${year}/${titleSlug}`
  }

  const createPost = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !content.trim()) {
        throw new Error('Title and content are required')
      }
      if (images.length > 5) {
        throw new Error('Maximum 5 images allowed')
      }

      setUploading(true)

      const slug = generateSlug()
      const finalStatus = isPublished ? 'published' : status
      // Wrap excerpt in <p> tags if it's plain text, otherwise use as is
      const finalExcerpt = excerpt.trim() 
        ? (excerpt.trim().startsWith('<') ? excerpt.trim() : `<p>${excerpt.trim()}</p>`)
        : (content ? content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) : '')

      const user = await supabase.auth.getUser()
      const authorId = user.data.user?.id || '00000000-0000-0000-0000-000000000000'

      if (editId) {
        // UPDATE existing post
        const { error: updateError } = await supabase
          .from('posts')
          .update({
            title,
            content_markdown: content,
            excerpt: finalExcerpt,
            status: finalStatus,
            category_id: categoryId || null,
            read_time: readTime,
            comments_enabled: commentsEnabled,
            updated_at: new Date().toISOString()
          })
          .eq('id', editId)

        if (updateError) throw updateError

        // Featured image is already uploaded and stored in database when selected
        // Just ensure it's set if we have a URL
        if (featuredImageUrl && !featuredImage) {
          // Already stored in database, no action needed
        } else if (featuredImage) {
          // This shouldn't happen if handleFeaturedImageSelect worked, but handle it just in case
          const fileExt = featuredImage.name.split('.').pop()
          const fileName = `featured-${editId}-${Date.now()}.${fileExt}`
          const { error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(fileName, featuredImage)
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('post-images')
              .getPublicUrl(fileName)
            await supabase
              .from('posts')
              .update({ featured_image: publicUrl })
              .eq('id', editId)
            setFeaturedImageUrl(publicUrl)
            setFeaturedImage(null)
          }
        }

        // Handle post_images for edited post
        // Separate existing images (from database) from new File objects
        const existingImages = images.filter((img): img is { url: string; id?: string } => 
          typeof img === 'object' && 'url' in img && !(img instanceof File)
        )
        const newImageFiles = images.filter((img): img is File => img instanceof File)

        // Get current post_images from database
        const { data: currentPostImages } = await supabase
          .from('post_images')
          .select('id, url')
          .eq('post_id', editId)
          .order('order_index')

        // Delete images that were removed (exist in DB but not in current images array)
        if (currentPostImages && Array.isArray(currentPostImages) && currentPostImages.length > 0) {
          const existingUrls = existingImages.map(img => img.url)
          const imagesToDelete = currentPostImages.filter(
            (dbImg: any) => !existingUrls.includes(dbImg.url)
          )
          
          if (imagesToDelete.length > 0) {
            const idsToDelete = imagesToDelete.map((img: any) => img.id)
            // Also delete from storage
            for (const img of imagesToDelete) {
              const url = (img as any).url
              const urlMatch = url.match(/post-images\/(.+)$/)
              const filePath = urlMatch ? urlMatch[1] : null
              if (filePath) {
                await supabase.storage.from('post-images').remove([filePath])
              }
            }
            await supabase
              .from('post_images')
              .delete()
              .in('id', idsToDelete)
          }
        }

        // Upload new image files and insert into post_images
        if (newImageFiles.length > 0) {
          const startIndex = existingImages.length
          const uploadedImages: Array<{ url: string; id?: string }> = []
          
          const uploadPromises = newImageFiles.map(async (file, index) => {
            const uuid = crypto.randomUUID()
            const fileName = `${editId}/${uuid}-${file.name}`
            
            // Upload to storage
            const { error: uploadError } = await supabase.storage
              .from('post-images')
              .upload(fileName, file)
            
            if (uploadError) {
              console.error('Error uploading image:', uploadError)
              throw new Error(`Failed to upload image: ${file.name}`)
            }
            
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('post-images')
              .getPublicUrl(fileName)
            
            // Insert into post_images table
            const { data: insertedImage, error: dbError } = await supabase
              .from('post_images')
              .insert({
                post_id: editId,
                url: publicUrl,
                alt_text: file.name,
                order_index: startIndex + index
              })
              .select('id, url, alt_text, order_index')
              .single()
            
            if (dbError) {
              console.error('Error inserting image into database:', dbError)
              throw new Error(`Failed to save image to database: ${file.name}`)
            }
            
            if (insertedImage) {
              uploadedImages.push({
                url: (insertedImage as any).url,
                id: (insertedImage as any).id
              })
            }
          })
          
          await Promise.all(uploadPromises)
          
          // Clean up preview URLs
          imagePreviews.forEach(preview => URL.revokeObjectURL(preview))
          setImagePreviews([])
          
          // Update state with all images (existing + newly uploaded)
          setImages([...existingImages, ...uploadedImages])
        } else {
          // Update order_index for existing images to match current order
          if (existingImages.length > 0) {
            const updatePromises = existingImages.map(async (img, index) => {
              if (img.id) {
                await supabase
                  .from('post_images')
                  .update({ order_index: index })
                  .eq('id', img.id)
              }
            })
            await Promise.all(updatePromises)
          }
        }

        // Handle tags for edited post (clear existing first)
        if (tags.length > 0) {
          await supabase.from('post_tags').delete().eq('post_id', editId)

          const tagPromises = tags.map(async (tagName) => {
            const slug = tagName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
            let tagId

            const { data: existingTag } = await supabase
              .from('tags')
              .select('id')
              .eq('slug', slug)
              .single()

            if (existingTag) {
              tagId = (existingTag as any).id
            } else {
              const { data: newTag } = await supabase
                .from('tags')
                .insert({ name: tagName, slug })
                .select('id')
                .single()
              tagId = (newTag as any)?.id
            }

            if (tagId) {
              await supabase.from('post_tags').insert({
                post_id: editId,
                tag_id: tagId
              })
            }
          })
          await Promise.all(tagPromises)
        }

        const { data: existingPost } = await supabase
          .from('posts')
          .select('slug')
          .eq('id', editId)
          .single()

        return { id: editId, slug: (existingPost as any)?.slug }
      } else {
        // CREATE new post
        const { data: post, error: postError } = await supabase
          .from('posts')
          .insert({
            author_id: authorId,
            title,
            slug,
            content_markdown: content,
            excerpt: finalExcerpt,
            status: finalStatus,
            category_id: categoryId || null,
            read_time: readTime,
            featured_image: featuredImageUrl || null,
            comments_enabled: commentsEnabled
          })
          .select()
          .single()

        if (postError) throw postError

        const postData = post as any

        // Upload featured image if it's a File object
        if (featuredImage) {
          const fileExt = featuredImage.name.split('.').pop()
          const uuid = crypto.randomUUID()
          const fileName = `${postData.id}/${uuid}-${featuredImage.name}`
          
          const { error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(fileName, featuredImage)
          
          if (uploadError) {
            console.error('Error uploading featured image:', uploadError)
            throw new Error('Failed to upload featured image')
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('post-images')
            .getPublicUrl(fileName)
          
          await supabase
            .from('posts')
            .update({ featured_image: publicUrl })
            .eq('id', postData.id)
          
          setFeaturedImageUrl(publicUrl)
          setFeaturedImage(null)
        }

        // Upload all selected images to storage and insert into post_images table
        const imageFiles = images.filter((img): img is File => img instanceof File)
        
        if (imageFiles.length > 0) {
          const uploadedImages: Array<{ url: string; id?: string }> = []
          
          // Upload each image to storage with path: postId/uuid-fileName.ext
          const uploadPromises = imageFiles.map(async (file, index) => {
            const fileExt = file.name.split('.').pop()
            const uuid = crypto.randomUUID()
            const fileName = `${postData.id}/${uuid}-${file.name}`
            
            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from('post-images')
              .upload(fileName, file)
            
            if (uploadError) {
              console.error('Error uploading image:', uploadError)
              throw new Error(`Failed to upload image: ${file.name}`)
            }
            
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('post-images')
              .getPublicUrl(fileName)
            
            // Insert into post_images table
            const { data: insertedImage, error: dbError } = await supabase
              .from('post_images')
              .insert({
                post_id: postData.id,
                url: publicUrl,
                alt_text: file.name, // Use file name as alt_text
                order_index: index
              })
              .select('id, url, alt_text, order_index')
              .single()
            
            if (dbError) {
              console.error('Error inserting image into database:', dbError)
              throw new Error(`Failed to save image to database: ${file.name}`)
            }
            
            if (insertedImage) {
              uploadedImages.push({
                url: (insertedImage as any).url,
                id: (insertedImage as any).id
              })
            }
          })
          
          await Promise.all(uploadPromises)
          
          // Update state with database URLs (remove File objects, add uploaded images)
          const existingImages = images.filter((img): img is { url: string; id?: string } => 
            typeof img === 'object' && 'url' in img && !(img instanceof File)
          )
          setImages([...existingImages, ...uploadedImages])
          
          // Clean up preview URLs
          imagePreviews.forEach(preview => URL.revokeObjectURL(preview))
          setImagePreviews([])
        }

        // Background operations
        Promise.resolve().then(async () => {
          try {

            // Handle tags
            if (tags.length > 0) {
              const tagPromises = tags.map(async (tagName) => {
                const slug = tagName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
                let tagId

                const { data: existingTag } = await supabase
                  .from('tags')
                  .select('id')
                  .eq('slug', slug)
                  .single()

                if (existingTag) {
                  tagId = (existingTag as any).id
                } else {
                  const { data: newTag } = await supabase
                    .from('tags')
                    .insert({ name: tagName, slug })
                    .select('id')
                    .single()
                  tagId = (newTag as any)?.id
                }
                return tagId
              })

              const tagIds = await Promise.all(tagPromises)
              const postData = post as any
              const postTagPromises = tagIds.map(async (tagId) => {
                if (tagId) {
                  await supabase.from('post_tags').insert({
                    post_id: postData.id,
                    tag_id: tagId
                  })
                }
              })
              await Promise.all(postTagPromises)
            }
          } catch (error) {
            console.warn('Background operations failed:', error)
          }
        })

        return post
      }
    },
    onSuccess: (post) => {
      setUploading(false)
      toast.success(editId ? 'Post updated successfully' : 'Post created successfully')
      const postData = post as any
      navigate(isPublished ? `/post/${postData.slug || postData.id}` : '/my-posts')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create post')
      setUploading(false)
    }
  })

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const newFiles = Array.from(e.target.files) as File[]
    const totalImages = images.length + newFiles.length
    if (totalImages > 5) {
      toast.error('Maximum 5 images allowed')
      return
    }

    // Store File objects (will be uploaded after post creation)
    setImages([...images, ...newFiles])
    
    // Create preview URLs for immediate display
    const newPreviews = newFiles.map(file => URL.createObjectURL(file))
    setImagePreviews([...imagePreviews, ...newPreviews])
    
    toast.success(`${newFiles.length} image(s) selected`)
  }

  const handleFeaturedImageSelect = async (e) => {
    if (!e.target.files?.[0]) return
    
    const file = e.target.files[0]
    setUploading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const timestamp = Date.now()
      const fileName = editId
        ? `featured-${editId}-${timestamp}.${fileExt}`
        : `temp-featured-${timestamp}.${fileExt}`

      // Upload to storage immediately
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Error uploading featured image:', uploadError)
        throw uploadError
      }

      // Get the public URL from Supabase storage
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName)

      // If editing an existing post, update database immediately
      if (editId) {
        const { error: dbError } = await supabase
          .from('posts')
          .update({ featured_image: publicUrl })
          .eq('id', editId)

        if (dbError) {
          console.error('Error storing featured image in database:', dbError)
          throw dbError
        }
      }

      // Update state with database URL
      setFeaturedImageUrl(publicUrl)
      setFeaturedImage(null) // Clear File object, URL is now in database
      toast.success('Featured image uploaded successfully')
    } catch (error: any) {
      console.error('Error uploading featured image:', error)
      toast.error(error.message || 'Failed to upload featured image')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = async (index: number) => {
    const imageToRemove = images[index]
    
    // If it's a File object, just remove it and revoke preview URL
    if (imageToRemove instanceof File) {
      // Find the corresponding preview URL index
      const fileIndex = images.slice(0, index).filter(img => img instanceof File).length
      if (fileIndex >= 0 && fileIndex < imagePreviews.length) {
        URL.revokeObjectURL(imagePreviews[fileIndex])
        setImagePreviews(imagePreviews.filter((_, i) => i !== fileIndex))
      }
      setImages(images.filter((_, i) => i !== index))
      return
    }
    
    // If it's an existing image from database (has id), delete it from storage and database
    if (typeof imageToRemove === 'object' && 'id' in imageToRemove && imageToRemove.id) {
      try {
        // Extract path from URL to delete from storage
        // URL format: https://.../storage/v1/object/public/post-images/postId/uuid-fileName.ext
        const url = imageToRemove.url
        const urlMatch = url.match(/post-images\/(.+)$/)
        const filePath = urlMatch ? urlMatch[1] : null
        
        if (filePath) {
          // Delete from storage
          await supabase.storage
            .from('post-images')
            .remove([filePath])
        }
        
        // Delete from database if we're editing a post
        if (editId) {
          await supabase
            .from('post_images')
            .delete()
            .eq('id', imageToRemove.id)
        }
      } catch (error) {
        console.warn('Error removing image:', error)
        // Continue with removing from UI even if deletion fails
      }
    }
    
    // Remove from local state
    setImages(images.filter((_, i) => i !== index))
  }

  const removeFeaturedImage = async () => {
    // If editing a post and featured image exists in database, delete it
    if (editId && featuredImageUrl && !featuredImage) {
      try {
        // Extract filename from URL to delete from storage
        const urlParts = featuredImageUrl.split('/')
        const fileName = urlParts[urlParts.length - 1].split('?')[0] // Remove query params
        
        // Delete from storage
        await supabase.storage
          .from('post-images')
          .remove([fileName])
        
        // Update database
        await supabase
          .from('posts')
          .update({ featured_image: null })
          .eq('id', editId)
      } catch (error) {
        console.warn('Error removing featured image:', error)
        // Continue with removing from UI even if deletion fails
      }
    }
    
    setFeaturedImage(null)
    setFeaturedImageUrl('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    createPost.mutate()
  }

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      const newTags = [...tags, trimmedTag]
      setTags(newTags)
      setTagInput('')
    } else if (tags.length >= 10) {
      toast.error('Maximum 10 tags allowed')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSelectExistingTag = (tagName) => {
    if (!tags.includes(tagName) && tags.length < 10) {
      setTags([...tags, tagName])
      setTagInput('')
    } else if (tags.length >= 10) {
      toast.error('Maximum 10 tags allowed')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/20 theme-transition">
      {/* Background Dot Pattern */}
      <div
        className="fixed inset-0 z-0 pointer-events-none dark:opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(#e5e7eb 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />
      
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
                <p className="text-slate-500 dark:text-slate-400 theme-transition">
                  Share your thoughts with the world
                </p>
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
                    <Label htmlFor="title" className="text-slate-700 dark:text-slate-300 font-medium theme-transition">
                      Title
                    </Label>
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
                      <Globe className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      URL Preview
                    </Label>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm theme-transition">
                      <span className="select-none text-slate-400 dark:text-slate-500">
                        chronicle.com/post/
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium truncate ml-1 theme-transition">
                        {title ? generateSlug() : 'ddmmyyyy-your-title'}
                      </span>
                    </div>
                  </div>

                  {/* Excerpt */}
                  <div className="space-y-2">
                    <Label htmlFor="excerpt" className="text-slate-700 dark:text-slate-300 font-medium theme-transition">
                      Excerpt
                    </Label>
                    <Textarea
                      id="excerpt"
                      value={excerpt} // Display plain text (HTML tags already stripped when loading)
                      onChange={(e) => {
                        setExcerpt(e.target.value); // Store plain text
                      }}
                      placeholder="Write a brief summary of your post..."
                      className="min-h-[80px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 resize-none theme-transition"
                    />
                    <p className="text-xs text-slate-400 dark:text-slate-500 theme-transition">
                      If left empty, the first 200 characters of content will be used
                    </p>
                  </div>

                  {/* Featured Image */}
                  <div className="space-y-3">
                    <Label className="text-slate-700 dark:text-slate-300 font-medium theme-transition">
                      Featured Image
                    </Label>
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
                            <X className="h-4 w-4 mr-2" />
                            Remove Image
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
                        <label
                          htmlFor="featured-upload"
                          className="cursor-pointer flex flex-col items-center gap-3"
                        >
                          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center theme-transition">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 theme-transition">
                            Click to upload cover image
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 theme-transition">
                            SVG, PNG, JPG or GIF. max. 800x400px
                          </p>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Settings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-slate-700 dark:text-slate-300 font-medium theme-transition">
                        Category
                      </Label>
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 theme-transition">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {(categories as any)?.map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="readTime" className="text-slate-700 dark:text-slate-300 font-medium theme-transition">
                        Read Time (minutes)
                      </Label>
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
                <Label htmlFor="content" className="text-lg font-bold text-slate-900 dark:text-slate-100 pl-1 theme-transition">
                  Story Content
                </Label>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm relative theme-transition">
                  {isLoadingPost ? (
                    <div className="min-h-[500px] flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">Loading post content...</p>
                      </div>
                    </div>
                  ) : (
                    <div ref={editorRef}>
                      <RichTextEditor
                        key={editId || 'new'} // Force re-render when switching between edit/create
                        content={content}
                        onChange={setContent}
                        placeholder="Start writing your story here... Type @ to mention someone"
                        editorRef={editorInstanceRef}
                      />
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
                  {images.length < 5 ? (
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
                  ) : null}
                  
                  {images.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-lg theme-transition">
                      No gallery images added yet
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {images.map((img, index) => {
                        const isFile = img instanceof File
                        // Use preview URL for File objects, or database URL for existing images
                        // Calculate preview index: count File objects before this index
                        const fileIndex = images.slice(0, index).filter(i => i instanceof File).length
                        const imageUrl = isFile 
                          ? (imagePreviews[fileIndex] || URL.createObjectURL(img))
                          : (img as { url: string }).url
                        return (
                          <div
                            key={index}
                            className="relative group rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm aspect-square theme-transition"
                          >
                            <img
                              src={imageUrl}
                              alt={isFile ? img.name : `Image ${index + 1}`}
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
                        )
                      })}
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
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Tag Input */}
                  <div className="flex flex-wrap gap-2 relative">
                    <Input
                      ref={tagInputRef}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      onFocus={checkTagMentions}
                      placeholder="Add a tag... Type @ to mention a tag"
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
                      <Label className="text-sm text-slate-600 font-medium">
                        Suggested Tags
                      </Label>
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
                              style={{
                                borderColor: `${tag.color}40`,
                                color: tag.color
                              }}
                            >
                              {tag.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Selected Tags */}
                  {tags.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
                      <TagIcon className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                      <p>No tags added yet</p>
                      <p className="text-xs mt-1">Add tags to improve discoverability</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-600 font-medium">
                        Selected Tags
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag, index) => {
                          const tagData = availableTags.find(t => t.name === tag)
                          return (
                            <div
                              key={index}
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-200"
                              style={{
                                backgroundColor: `${tagData?.color || '#3B82F6'}20`,
                                borderColor: `${tagData?.color || '#3B82F6'}40`,
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
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Publication Settings */}
              <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden theme-transition">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-1">
                      <Label className="text-slate-900 dark:text-slate-100 font-semibold theme-transition">
                        Publish Settings
                      </Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400 theme-transition">
                        Manage visibility and status
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-6 sm:justify-end">
                      {/* Status Dropdown */}
                      <div className="flex items-center gap-2">
                        <Label htmlFor="status" className="text-slate-600 dark:text-slate-400 text-sm theme-transition">
                          Status
                        </Label>
                        <Select value={status} onValueChange={(value) => setStatus(value)}>
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
                            setIsPublished(checked)
                            if (checked) setStatus('published')
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
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 pb-4 theme-transition">
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
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full theme-transition">
                        0 comments
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 theme-transition">
                  {commentsEnabled
                    ? 'Readers can comment on this post. Toggle to disable commenting.'
                    : 'Comments are disabled for this post. Toggle to enable commenting.'}
                </CardDescription>
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {editId ? 'Update Post' : 'Publish Post'}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}

export default CreatePost