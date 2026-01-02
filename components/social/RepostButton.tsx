import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Repeat, Quote, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RepostButtonProps {
  postId: string;
  postTitle: string;
  authorName: string;
}

export const RepostButton = ({ postId, postTitle, authorName }: RepostButtonProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [quoteText, setQuoteText] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: hasReposted } = useQuery({
    queryKey: ['has-reposted', user?.id, postId],
    queryFn: async () => {
      if (!user) return false;

      const { data } = await supabase
        .from('reposts')
        .select('id')
        .eq('user_id', user.id)
        .eq('original_post_id', postId)
        .maybeSingle();

      return !!data;
    },
    enabled: !!user,
  });

  const repostMutation = useMutation({
    mutationFn: async (withQuote: boolean) => {
      if (!user) throw new Error('Not authenticated');

      if (hasReposted) {
        // Remove repost
        await supabase
          .from('reposts')
          .delete()
          .eq('user_id', user.id)
          .eq('original_post_id', postId);
      } else {
        // Create repost
        await supabase
          .from('reposts')
          .insert({
            user_id: user.id,
            original_post_id: postId,
            quote_text: withQuote ? quoteText : null,
          });

        // Create notification for original author
        const { data: originalPost } = await supabase
          .from('posts')
          .select('author_id')
          .eq('id', postId)
          .single();

        if (originalPost && originalPost.author_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: originalPost.author_id,
            type: 'repost',
            title: withQuote ? 'Your post was quoted' : 'Your post was reposted',
            message: `${user.user_metadata?.full_name || 'Someone'} ${withQuote ? 'quoted' : 'reposted'} "${postTitle}"`,
            post_id: postId,
            from_user_id: user.id,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['has-reposted', user?.id, postId] });
      queryClient.invalidateQueries({ queryKey: ['reposts'] });
      setIsDialogOpen(false);
      setQuoteText('');
      toast.success(hasReposted ? 'Repost removed' : 'Reposted successfully!');
    },
    onError: () => {
      toast.error('Failed to repost');
    },
  });

  if (!user) return null;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1.5 ${hasReposted ? 'text-green-600 dark:text-green-400' : 'text-slate-500 hover:text-green-600'}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (hasReposted) {
              repostMutation.mutate(false);
            }
          }}
        >
          <Repeat className="h-4 w-4" />
          <span className="text-sm">Repost</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Repost "{postTitle}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Originally by {authorName}
          </p>

          <div className="space-y-2">
            <Textarea
              placeholder="Add your thoughts (optional)..."
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => repostMutation.mutate(false)}
              disabled={repostMutation.isPending}
              variant="outline"
              className="flex-1"
            >
              {repostMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Repeat className="h-4 w-4 mr-2" />
              )}
              Repost
            </Button>
            <Button
              onClick={() => repostMutation.mutate(true)}
              disabled={repostMutation.isPending || !quoteText.trim()}
              className="flex-1"
            >
              {repostMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Quote className="h-4 w-4 mr-2" />
              )}
              Quote
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
