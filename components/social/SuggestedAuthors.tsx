import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { FollowButton } from './FollowButton';
import { Link } from 'react-router-dom';
import { Users, Loader2 } from 'lucide-react';
import { UserBadge } from '@/components/UserBadge';

export const SuggestedAuthors = () => {
  const { user } = useAuth();

  const { data: suggestedAuthors, isLoading } = useQuery({
    queryKey: ['suggested-authors', user?.id],
    queryFn: async () => {
      // First, get authors the user already follows
      let excludeIds: string[] = [];
      if (user) {
        const { data: following } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', user.id);

        excludeIds = (following || []).map((f: any) => f.following_id);
        excludeIds.push(user.id); // Exclude self
      }

      // Get all profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, profile_image_url, bio, badge')
        .limit(20);

      if (error) throw error;

      // Filter out followed users
      const filteredProfiles = (profiles || []).filter(
        (p: any) => !excludeIds.includes(p.id)
      );

      // Get follower and post counts for each author
      const authorsWithStats = await Promise.all(
        filteredProfiles.slice(0, 5).map(async (author: any) => {
          const [{ count: followersCount }, { count: postsCount }] = await Promise.all([
            supabase.from('followers').select('id', { count: 'exact', head: true }).eq('following_id', author.id),
            supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', author.id).eq('status', 'published')
          ]);

          return {
            ...author,
            followers: [{ count: followersCount || 0 }],
            posts: [{ count: postsCount || 0 }]
          };
        })
      );

      // Sort by follower count
      return authorsWithStats.sort((a: any, b: any) =>
        (b.followers?.[0]?.count || 0) - (a.followers?.[0]?.count || 0)
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  if (!suggestedAuthors || suggestedAuthors.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
          <Users className="h-4 w-4" />
        </div>
        <h3 className="font-bold text-slate-900 dark:text-slate-100">Suggested Authors</h3>
      </div>

      <div className="space-y-4">
        {suggestedAuthors.map((author: any) => (
          <div key={author.id} className="flex items-center gap-3">
            <Link to={`/author/${author.id}`} className="shrink-0">
              <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-900 shadow-sm hover:ring-2 hover:ring-blue-100 dark:hover:ring-blue-900/20 transition-all">
                <AvatarImage src={author.profile_image_url || ''} />
                <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-sm">
                  {author.full_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex-1 min-w-0">
              <Link to={`/author/${author.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{author.full_name}</p>
                <UserBadge userId={author.id} />
              </Link>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {author.followers?.[0]?.count || 0} followers · {author.posts?.[0]?.count || 0} posts
              </p>
            </div>

            <FollowButton userId={author.id} size="sm" variant="outline" />
          </div>
        ))}
      </div>
    </Card>
  );
};
