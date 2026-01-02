import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Repeat, MessageSquare, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface RepostButtonProps {
  postId: string;
  postAuthorId: string;
  postTitle: string;
  postSlug: string;
  className?: string;
}

export const RepostButton = ({ 
  postId, 
  postAuthorId, 
  postTitle, 
  postSlug,
  className = '' 
}: RepostButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const repostMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');

      // Check if already reposted
      const { data: existingRepost } = await supabase
        .from('posts')
        .select('id')
        .eq('author_id', user.id)
        .eq('original_post_id', postId)
        .single();

      if (existingRepost) {
        throw new Error('You have already reposted this post');
      }

      // Create repost
      const { data, error } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          title: `Repost: ${postTitle}`,
          slug: `repost-${postId}-${user.id}-${Date.now()}`,
          content_markdown: `> Originally posted by [author](${postAuthorId})\n\n[View Original Post](${postSlug})`,
          status: 'published',
          original_post_id: postId,
          is_repost: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Post reposted successfully!');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to repost post');
    },
  });

  const handleRepost = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    repostMutation.mutate();
  };

  const handleQuote = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate(`/create?quote=${postId}`);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg h-8 w-8 p-0 ${className}`}
        >
          <Repeat className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-xl border-slate-200 dark:border-slate-700 shadow-lg p-2"
      >
        <DropdownMenuItem
          onClick={handleRepost}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          disabled={repostMutation.isPending}
        >
          <Repeat className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className="text-sm">Repost</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleQuote}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <MessageSquare className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className="text-sm">Quote Post</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard.writeText(window.location.origin + `/post/${postSlug}`);
            toast.success('Link copied to clipboard!');
          }}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <Share2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className="text-sm">Copy Link</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
