import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FollowButtonProps {
  userId: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
}

export const FollowButton = ({ userId, size = 'sm', variant = 'default' }: FollowButtonProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isFollowing, isLoading: checkingFollow } = useQuery({
    queryKey: ['is-following', user?.id, userId],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && user.id !== userId,
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      if (isFollowing) {
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('followers')
          .insert({
            follower_id: user.id,
            following_id: userId,
          });
        
        if (error) throw error;
        
        // Create notification for the followed user
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'follow',
          title: 'New follower',
          message: `${user?.user_metadata?.full_name || user?.email || 'A user'} started following you`,
          from_user_id: user.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-following', user?.id, userId] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-followers'] });
      toast.success(isFollowing ? 'Unfollowed successfully' : 'Following!');
    },
    onError: () => {
      toast.error('Failed to update follow status');
    },
  });

  // Don't show button for own profile or if not logged in
  if (!user || user.id === userId) return null;

  return (
    <Button
      size={size}
      variant={isFollowing ? 'outline' : variant}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFollow.mutate();
      }}
      disabled={toggleFollow.isPending || checkingFollow}
    >
      {toggleFollow.isPending || checkingFollow ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="h-4 w-4 mr-1" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-1" />
          Follow
        </>
      )}
    </Button>
  );
};