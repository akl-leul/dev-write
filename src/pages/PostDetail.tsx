import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart,
  MessageCircle,
  Trash2,
  Edit,
  Share2,
  Copy,
  Twitter,
  Facebook,
  Linkedin,
  Eye,
  Clock,
  Calendar,
  Tag as TagIcon,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CommentSection } from "@/components/blog/CommentSection";
import { useState } from "react";
import { Lightbox } from "@/components/ui/lightbox";
import { PostMetaTags } from "@/components/seo/PostMetaTags";
import { ReadingProgressBar } from "@/components/ui/reading-progress";
import { usePostViews } from "@/hooks/usePostViews";
import { BookmarkButton } from "@/components/social/BookmarkButton";
import { FollowButton } from "@/components/social/FollowButton";
import { getImageDisplayLogic, getGalleryImages, shouldShowGallery } from "@/utils/imageLogic";
import { FallbackImage } from "@/components/ui/FallbackImage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Define the post type for better TypeScript support
type Post = {
  id: string;
  title: string;
  slug: string;
  content_markdown: string;
  excerpt: string;
  featured_image: string | null;
  author_id: string;
  category_id: string;
  status: string;
  read_time: number;
  views: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    profile_image_url: string | null;
  };
  post_images?: {
    url: string;
    alt_text: string | null;
    order_index: number;
  }[];
  likes?: {
    user_id: string;
  }[];
  comments?: {
    count: number;
  }[];
  categories?: {
    name: string;
    slug: string;
  };
  post_tags?: {
    tags: {
      id: string;
      name: string;
      slug: string;
      color: string;
    };
  }[];
  tags?: {
    id: string;
    name: string;
    slug: string;
    color: string;
  }[];
};

const PostDetail = () => {
  const { "*": slugPath } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Extract the slug from path (handles both old and new format)
  const slug = slugPath || "";

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ["post", slug],
    queryFn: async () => {
      if (!slug) throw new Error('No slug provided');
      
      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          profiles:author_id (full_name, profile_image_url),
          post_images (url, alt_text, order_index),
          likes (user_id),
          comments (count),
          categories:category_id (name, slug),
          post_tags (
            tags (
              id, name, slug, color
            )
          ),
          views
        `,
        )
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Post not found');
      return data as unknown as Post;
    },
    enabled: !!slug,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use the new post views hook for deduplication
  usePostViews({ 
    postId: post?.id || '', 
    slug, 
    enabled: !!post?.id 
  });

  const likePost = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in");

      const isLiked = post?.likes?.some(
        (like: any) => like.user_id === user.id,
      );

      if (isLiked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("likes")
          .insert({ post_id: post.id, user_id: user.id });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", slug] });
    },
    onError: () => {
      toast.error("Failed to update like");
    },
  });

  const deletePost = useMutation({
    mutationFn: async () => {
      if (!post || post.author_id !== user?.id) {
        throw new Error("Unauthorized");
      }

      const { error } = await supabase.from("posts").delete().eq("id", post.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted");
      navigate("/feed");
    },
    onError: () => {
      toast.error("Failed to delete post");
    },
  });

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl w-3/4 animate-pulse"></div>
            <div className="h-80 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm animate-pulse"></div>
            <div className="space-y-4">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <div className="container py-20 text-center">
          <div className="max-w-md mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Post not found
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              The story you are looking for might have been removed or is
              unavailable.
            </p>
            <Button
              onClick={() => navigate("/feed")}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              Back to Feed
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isLiked = post.likes?.some((like: any) => like.user_id === user?.id);
  const isAuthor = user?.id === post.author_id;
  const postUrl = window.location.href;
  const postDate = new Date(post.created_at);

  // Use image logic utility to determine image display
  const imageDisplay = getImageDisplayLogic(post.featured_image, post.post_images);
  const galleryImages = getGalleryImages(post.featured_image, post.post_images);
  const showGallery = shouldShowGallery(post.featured_image, post.post_images);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleShare = (platform: string) => {
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(post.title)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`,
    };

    if (platform === "copy") {
      navigator.clipboard.writeText(postUrl);
      toast.success("Link copied to clipboard!");
    } else {
      window.open(shareUrls[platform as keyof typeof shareUrls], "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-accent/20">
      {/* Reading Progress Bar */}
      <ReadingProgressBar />

      {/* Dynamic SEO Meta Tags */}
      <PostMetaTags
        title={post.title}
        description={post.excerpt || post.content_markdown.substring(0, 160)}
        image={post.featured_image || post.post_images?.[0]?.url}
        url={postUrl}
        authorName={post.profiles?.full_name}
        publishedTime={post.created_at}
      />

      {/* Image Lightbox */}
      <Lightbox
        images={galleryImages.map(img => ({ url: img.url, alt: img.alt_text || post.title }))}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Background Dot Pattern */}
      <div
        className="fixed inset-0 z-0 pointer-events-none dark:opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      ></div>

      <div className="relative z-10">
        <Header />

        <article className="container mx-auto py-12 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header / Meta Information */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-100 dark:border-slate-800 shadow-sm mb-8">
              {/* Category, Tags & Date Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                  {post.categories && (
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider">
                      {post.categories.name}
                    </span>
                  )}

                  {/* Tags */}
                  {post.post_tags && post.post_tags.length > 0 && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <TagIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        {post.post_tags.map((postTag, index) => (
                          <span
                            key={postTag.tags.id}
                            className="px-2 py-1 text-xs font-medium rounded-full border"
                            style={{
                              backgroundColor: postTag.tags.color + "20",
                              borderColor: postTag.tags.color + "40",
                              color: postTag.tags.color,
                            }}
                          >
                            {postTag.tags.name}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    <span>{post.read_time || 5} min read</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-400 dark:text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    <span>{post.views || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>{format(postDate, "MMM dd, yyyy")}</span>
                  </div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-8 leading-tight tracking-tight">
                {post.title}
              </h1>

              {/* Author & Actions Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-6 border-t border-slate-50 dark:border-slate-700">
                <Link
                  to={`/author/${post.author_id}`}
                  className="flex items-center gap-4 group"
                >
                  <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-900 shadow-sm ring-2 ring-slate-50 dark:ring-slate-700 group-hover:ring-blue-100 dark:group-hover:ring-blue-900/20 transition-all">
                    <AvatarImage src={post.profiles?.profile_image_url || ""} />
                    <AvatarFallback className="bg-slate-900 text-white font-bold">
                      {post.profiles?.full_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {post.profiles?.full_name}
                      </p>
                      <FollowButton userId={post.author_id} />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Author</p>
                  </div>
                </Link>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <BookmarkButton postId={post.id} />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl"
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="rounded-xl border-slate-200 dark:border-slate-700 shadow-lg"
                    >
                      <DropdownMenuItem
                        onClick={() => handleShare("copy")}
                        className="focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer"
                      >
                        <Copy className="h-4 w-4 mr-2 text-slate-400 dark:text-slate-500" />
                        Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleShare("twitter")}
                        className="focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer"
                      >
                        <Twitter className="h-4 w-4 mr-2 text-blue-400 dark:text-blue-400" />
                        Twitter
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleShare("facebook")}
                        className="focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer"
                      >
                        <Facebook className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-500" />
                        Facebook
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleShare("linkedin")}
                        className="focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer"
                      >
                        <Linkedin className="h-4 w-4 mr-2 text-blue-700 dark:text-blue-600" />
                        LinkedIn
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {isAuthor && (
                    <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-100 dark:border-slate-700">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/create?edit=${post.id}`)}
                        className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg h-9 w-9"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to delete this post?",
                            )
                          ) {
                            deletePost.mutate();
                          }
                        }}
                        className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg h-9 w-9"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-400 dark:text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  <span>{post.views || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{format(postDate, "MMM dd, yyyy")}</span>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-100 dark:border-slate-800 shadow-sm mb-12">
              <div className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl">
                <div
                  dangerouslySetInnerHTML={{ __html: post.content_markdown }}
                />
              </div>
            </div>

            {/* Engagement Actions */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <Button
                variant={isLiked ? "default" : "outline"}
                onClick={() => (user ? likePost.mutate() : navigate("/auth"))}
                size="lg"
                className={`rounded-full px-8 h-12 shadow-lg transition-all ${
                  isLiked
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20 border-red-500"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                }`}
              >
                <Heart
                  className={`h-5 w-5 mr-2 ${isLiked ? "fill-current" : ""}`}
                />
                {post.likes?.length || 0} Likes
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 h-12 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-lg shadow-slate-200/50 dark:shadow-slate-800/50"
                onClick={() => {
                  document
                    .getElementById("comments-section")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                {post.comments?.[0]?.count || 0} Comments
              </Button>
            </div>

            {/* Comments Section */}
            <div
              id="comments-section"
              className="bg-slate-50/50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden"
            >
              <CommentSection postId={post.id} />
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default PostDetail;