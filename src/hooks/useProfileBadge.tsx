import { useMemo } from 'react';

interface UseProfileBadgeProps {
  userId: string;
  postsCount?: number;
  likesCount?: number;
  followersCount?: number;
}

export function useProfileBadge({ 
  userId, 
  postsCount = 0, 
  likesCount = 0, 
  followersCount = 0 
}: UseProfileBadgeProps) {
  const badge = useMemo(() => {
    // First post badge - highest priority for new users
    if (postsCount === 1) return 'trophy';
    
    // Dynamic badge assignment based on user metrics
    if (postsCount >= 50) return 'crown';
    if (postsCount >= 30) return 'trophy';
    if (postsCount >= 20) return 'award';
    if (postsCount >= 10) return 'medal';
    if (postsCount >= 5) return 'star';
    if (followersCount >= 100) return 'verified';
    if (followersCount >= 50) return 'shield';
    if (followersCount >= 25) return 'zap';
    if (likesCount >= 500) return 'heart';
    if (likesCount >= 200) return 'sparkles';
    if (likesCount >= 100) return 'gem';
    
    return null;
  }, [postsCount, likesCount, followersCount]);

  return { badge };
}
