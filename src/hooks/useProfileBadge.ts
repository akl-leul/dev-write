import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProfileBadgeHookProps {
  userId?: string;
  postsCount?: number;
  likesCount?: number;
  followersCount?: number;
}

export function useProfileBadge({ userId, postsCount, likesCount, followersCount }: ProfileBadgeHookProps) {
  // If userId is provided and stats are not passed, fetch from database
  const needsStats = !!userId && (postsCount === undefined || likesCount === undefined || followersCount === undefined);
  
  const { data: stats } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      // Get posts count
      const { count: postsCount } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', userId)
        .eq('status', 'published');
      
      // Get total likes on user's posts - only if we have posts
      let totalLikes = 0;
      if (postsCount && postsCount > 0) {
        const { data: postsData } = await supabase
          .from('posts')
          .select('id')
          .eq('author_id', userId)
          .eq('status', 'published')
          .limit(100); // Limit to prevent huge queries
        
        if (postsData && postsData.length > 0) {
          const postIds = postsData.map(p => p.id);
          const { count: likesCount } = await supabase
            .from('likes')
            .select('id', { count: 'exact', head: true })
            .in('post_id', postIds);
          totalLikes = likesCount || 0;
        }
      }
      
      // Get followers count
      const { count: followersCount } = await supabase
        .from('followers')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', userId);
      
      return {
        posts: postsCount ?? 0,
        likes: totalLikes,
        followers: followersCount ?? 0,
      };
    },
    enabled: needsStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const badge = useMemo(() => {
    const counts = stats || { posts: postsCount || 0, likes: likesCount || 0, followers: followersCount || 0 };
    
    // Priority-based badge system
    // Higher priority badges override lower ones
    
    // TEMPORARY: Always show a star badge for testing
    // Remove this when debugging is complete
    return 'star';
    
    // 1. Check for 3+ likes (highest priority after custom badges)
    if (counts.likes >= 3) {
      return 'heart';
    }
    
    // 2. Check for 1+ follower
    if (counts.followers >= 1) {
      return 'users';
    }
    
    // 3. Check for 1+ post
    if (counts.posts >= 1) {
      return 'star';
    }
    
    // No badge if no achievements
    return null;
  }, [stats, postsCount, likesCount, followersCount]);

  return {
    badge,
    stats: stats || { posts: postsCount || 0, likes: likesCount || 0, followers: followersCount || 0 },
  };
}
