import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Bookmark, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils'; // Assuming you have standard shadcn utils, if not remove this wrapper

interface BookmarkButtonProps {
  postId: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string; // Added to allow external layout overrides
}

export const BookmarkButton = ({ 
  postId, 
  size = 'sm', 
  variant = 'ghost', // Changed default to ghost for cleaner look in feeds
  className 
}: BookmarkButtonProps) => {
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
      // Shorter, cleaner toasts
      toast.success(isBookmarked ? 'Removed' : 'Saved');
    },
    onError: () => {
      toast.error('Could not update bookmark');
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      // Optional: Add a mode=signup query param if you want them to go straight to signup
      navigate('/auth?mode=signup'); 
      return;
    }
    
    toggleBookmark.mutate();
  };

  const isLoading = toggleBookmark.isPending || checkingBookmark;

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleClick}
      disabled={isLoading}
      // UI Customization Logic
      className={cn(
        "group transition-all duration-300 ease-in-out",
        // Active State (Blue brand color)
        isBookmarked 
          ? "text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 border-blue-100" 
          : "text-slate-400 hover:text-slate-900 hover:bg-slate-100",
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin opacity-50" />
      ) : (
        <>
          <Bookmark 
            className={cn(
              "h-4 w-4 transition-transform duration-300 group-active:scale-90",
              size !== 'icon' && "mr-2",
              // Filled icon when bookmarked
              isBookmarked ? "fill-blue-600" : "fill-transparent"
            )} 
          />
          {size !== 'icon' && (
            <span className={cn(isBookmarked ? "font-medium" : "font-normal")}>
              {isBookmarked ? 'Saved' : 'Save'}
            </span>
          )}
        </>
      )}
    </Button>
  );
};