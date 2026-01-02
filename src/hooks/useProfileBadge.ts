import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProfileBadgeHookProps {
  userId?: string;
  postsCount?: number;
  likesCount?: number;
  followersCount?: number;
}

export function useProfileBadge({
  userId,
  postsCount,
  likesCount,
  followersCount,
}: ProfileBadgeHookProps) {
  // If userId is provided and stats are not passed, fetch from database
  const needsStats = !!userId && (postsCount === undefined || likesCount === undefined || followersCount === undefined);

  const { data: stats } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { count: postsCount } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', userId)
        .eq('status', 'published');

      let totalLikes = 0;
      if (postsCount && postsCount > 0) {
        const { data: postsData } = await supabase
          .from('posts')
          .select('id')
          .eq('author_id', userId)
          .eq('status', 'published')
          .limit(100);

        if (postsData && postsData.length > 0) {
          const postIds = (postsData as { id: string }[]).map(p => p.id);
          const { count: likesCount } = await supabase
            .from('likes')
            .select('id', { count: 'exact', head: true })
            .in('post_id', postIds);
          totalLikes = likesCount || 0;
        }
      }

      const { count: followersCount } = await supabase
        .from('followers')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', userId);

      // Also fetch the badge from profile as fallback
      const { data: profile } = await supabase
        .from('profiles')
        .select('badge')
        .eq('id', userId)
        .maybeSingle();

      return {
        posts: postsCount ?? 0,
        likes: totalLikes,
        followers: followersCount ?? 0,
        initialBadge: profile?.badge
      };
    },
    enabled: needsStats,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const badge = useMemo(() => {
    const counts = stats || { posts: postsCount || 0, likes: likesCount || 0, followers: followersCount || 0 };

    // Higher tier achievements first
    if (counts.posts >= 50) return 'crown';
    if (counts.likes >= 100) return 'gem';
    if (counts.followers >= 50) return 'verified';

    // Mid-tier achievements
    if (counts.posts >= 20) return 'trophy';
    if (counts.likes >= 50) return 'sparkles';
    if (counts.followers >= 10) return 'zap';

    // Lower-tier achievements
    if (counts.posts >= 10) return 'award';
    if (counts.likes >= 10) return 'heart';
    if (counts.posts >= 3) return 'medal';
    if (counts.posts >= 1) return 'star';

    // Fallback to manual badge from stats
    if ((counts as any).initialBadge) return (counts as any).initialBadge;

    return null;
  }, [stats, postsCount, likesCount, followersCount]);

  return {
    badge,
    stats: stats || { posts: postsCount || 0, likes: likesCount || 0, followers: followersCount || 0 },
  };
}
