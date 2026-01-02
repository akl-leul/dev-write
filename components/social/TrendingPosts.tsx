import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { TrendingUp, Eye, Heart, Flame } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { FollowButton } from './FollowButton';

export const TrendingPosts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleViewAllPosts = () => {
    // On mobile, navigate to discover tab
    if (isMobile) {
      navigate('/feed?tab=discover');
    } else {
      // On desktop, still navigate to discover tab
      navigate('/feed?tab=discover');
    }
  };

  const { data: trendingPosts, isLoading } = useQuery({
    queryKey: ['trending-posts'],
    queryFn: async () => {
      // Get posts from the last 7 days with most engagement (views + likes)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          slug,
          views,
          created_at,
          author_id,
          profiles:author_id (full_name),
          likes (count)
        `)
        .eq('status', 'published')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('views', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Sort by engagement score (views + likes*10)
      return data?.sort((a: any, b: any) => {
        const scoreA = (a.views || 0) + (a.likes?.[0]?.count || 0) * 10;
        const scoreB = (b.views || 0) + (b.likes?.[0]?.count || 0) * 10;
        return scoreB - scoreA;
      }) || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  if (isLoading) {
    return (
      <Card className="p-6 bg-white rounded-2xl border border-slate-100">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      </Card>
    );
  }

  if (!trendingPosts || trendingPosts.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400 rounded-lg">
          <TrendingUp className="h-4 w-4" />
        </div>
        <h3 className="font-bold text-slate-900 dark:text-slate-100">Trending This Week</h3>
        <Flame className="h-4 w-4 text-orange-400 animate-pulse" />
      </div>

      <div className="space-y-4">
        {trendingPosts.map((post: any, index: number) => (
          <Link
            key={post.id}
            to={`/post/${post.slug}`}
            className="group flex gap-4 items-start hover:bg-slate-50 dark:hover:bg-slate-800 -mx-2 px-2 py-2 rounded-xl transition-colors"
          >
            <span className={`text-2xl font-bold shrink-0 w-8 ${index === 0 ? 'text-orange-500' :
                index === 1 ? 'text-slate-400' :
                  index === 2 ? 'text-amber-600' : 'text-slate-300'
              }`}>
              {String(index + 1).padStart(2, '0')}
            </span>

            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug mb-1">
                {post.title}
              </h4>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                  <span className="truncate">{post.profiles?.full_name}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {post.views || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {post.likes?.[0]?.count || 0}
                  </span>
                </div>

                {/* Follow Button for Trending Posts */}
                {user && post.author_id !== user.id && (
                  <FollowButton
                    userId={post.author_id}
                    size="sm"
                    variant="outline"
                  />
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700">
        <button
          onClick={handleViewAllPosts}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium hover:underline"
        >
          View all posts →
        </button>
      </div>
    </Card>
  );
};
