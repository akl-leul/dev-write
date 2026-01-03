import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface PostViewsHookOptions {
  postId: string;
  slug: string;
  enabled?: boolean;
}

export const usePostViews = ({ postId, slug, enabled = true }: PostViewsHookOptions) => {
  const queryClient = useQueryClient();
  const hasIncremented = useRef(false);

  useEffect(() => {
    if (!enabled || !postId) return;

    const incrementViews = async () => {
      // Check if user has already viewed this post
      const userId = getCurrentUserId();
      if (!userId) return; // Don't track views for anonymous users
      
      const viewKey = `post_view_${postId}_${userId}`;
      const hasViewed = localStorage.getItem(viewKey);
      
      if (hasViewed) {
        return; // User has already viewed this post
      }

      // Mark as viewed immediately to prevent duplicate increments
      localStorage.setItem(viewKey, 'true');
      hasIncremented.current = true;

      try {
        // Direct update - get current view count, then increment
        const { data: currentPost } = await supabase
          .from("posts")
          .select("views")
          .eq("id", postId)
          .single();
        
        const result = await supabase
          .from("posts")
          .update({ views: (currentPost?.views || 0) + 1 })
          .eq("id", postId);

        if (result.error) {
          console.error("Failed to increment views:", result.error);
          localStorage.removeItem(viewKey);
          hasIncremented.current = false;
        } else {
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["post", slug] });
          }, 1000);
        }
      } catch (error) {
        console.error("Error incrementing views:", error);
        localStorage.removeItem(viewKey);
        hasIncremented.current = false;
      }
    };

    incrementViews();
    
    return () => {
      hasIncremented.current = false;
    };
  }, [postId, slug, enabled, queryClient]);

  const getCurrentUserId = (): string | null => {
    return null; // Will be handled async in the effect
  };

  // Function to check if user has viewed post
  const hasUserViewedPost = (userId: string): boolean => {
    const viewKey = `post_view_${postId}_${userId}`;
    return localStorage.getItem(viewKey) === 'true';
  };

  // Function to clear view history (for testing/admin purposes)
  const clearViewHistory = (userId?: string) => {
    if (userId) {
      localStorage.removeItem(`post_view_${postId}_${userId}`);
    } else {
      // Clear all view history for this post
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`post_view_${postId}_`)) {
          localStorage.removeItem(key);
        }
      });
    }
  };

  return {
    hasIncremented: hasIncremented.current,
    hasUserViewedPost,
    clearViewHistory,
  };
};
