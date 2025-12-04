import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Bookmark, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface BookmarkButtonProps {
  postId: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost';
}

export const BookmarkButton = ({ postId, size = 'sm', variant = 'outline' }: BookmarkButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: isBookmarked, isLoading: checkingBookmark } = useQuery({
    queryKey: ['is-bookmarked', user?.id, postId],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!user,
  });

  const toggleBookmark = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      if (isBookmarked) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: user.id,
            post_id: postId,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-bookmarked', user?.id, postId] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      toast.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
    },
    onError: () => {
      toast.error('Failed to update bookmark');
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      navigate('/auth');
      return;
    }
    
    toggleBookmark.mutate();
  };

  return (
    <Button
      size={size}
      variant={isBookmarked ? 'default' : variant}
      onClick={handleClick}
      disabled={toggleBookmark.isPending || checkingBookmark}
      className={isBookmarked ? 'bg-accent' : ''}
    >
      {toggleBookmark.isPending || checkingBookmark ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Bookmark className={`h-4 w-4 ${size !== 'icon' ? 'mr-2' : ''} ${isBookmarked ? 'fill-current' : ''}`} />
          {size !== 'icon' && (isBookmarked ? 'Saved' : 'Save')}
        </>
      )}
    </Button>
  );
};