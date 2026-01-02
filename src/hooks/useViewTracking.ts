import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Generate a session ID for anonymous users
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('view_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('view_session_id', sessionId);
  }
  return sessionId;
};

export const useViewTracking = (postId: string | undefined) => {
  const { user } = useAuth();
  const hasTracked = useRef(false);

  useEffect(() => {
    const trackView = async () => {
      if (!postId || hasTracked.current) return;

      hasTracked.current = true;

      try {
        const sessionId = getSessionId();

        // Try to insert a view record
        const viewData: any = {
          post_id: postId,
        };

        if (user?.id) {
          viewData.user_id = user.id;
        } else {
          viewData.session_id = sessionId;
        }

        const { error } = await (supabase as any)
          .from('post_views')
          .insert(viewData);

        // If no error (first view) or unique constraint violation (already viewed), update post views count
        if (!error) {
          // Increment the views count on the post
          await supabase
            .from('posts')
            .update({ views: supabase.rpc ? undefined : 1 }) // Placeholder, we'll do raw increment
            .eq('id', postId);
          
          // Use raw SQL increment via RPC or direct update
          const { data: currentPost } = await supabase
            .from('posts')
            .select('views')
            .eq('id', postId)
            .single();

          if (currentPost) {
            await supabase
              .from('posts')
              .update({ views: (currentPost.views || 0) + 1 })
              .eq('id', postId);
          }
        }
        // If error code is 23505 (unique violation), user already viewed - don't increment
      } catch (err) {
        console.error('Error tracking view:', err);
        hasTracked.current = false; // Allow retry
      }
    };

    trackView();
  }, [postId, user?.id]);

  return hasTracked.current;
};
