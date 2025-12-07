import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileBadge } from '@/components/ProfileBadge';
import { useProfileBadge } from '@/hooks/useProfileBadge';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface PostAuthorBadgeProps {
  author: {
    id: string;
    full_name: string;
    profile_image_url?: string;
    badge?: string | null;
  };
  createdAt: string;
  postsCount?: number;
  likesCount?: number;
  followersCount?: number;
}

export function PostAuthorBadge({ 
  author, 
  createdAt, 
  postsCount,
  likesCount,
  followersCount 
}: PostAuthorBadgeProps) {
  const { badge: dynamicBadge } = useProfileBadge({
    userId: author.id,
    postsCount,
    likesCount,
    followersCount,
  });

  // Use custom badge if set, otherwise use dynamic badge
  const displayBadge = author.badge || dynamicBadge;

  return (
    <Link 
      to={`/author/${author.id}`} 
      className="flex items-center gap-3 group"
      onClick={(e) => e.stopPropagation()}
    >
      <Avatar className="h-10 w-10 border-2 border-white shadow-sm group-hover:ring-2 group-hover:ring-blue-100 transition-all">
        <AvatarImage src={author.profile_image_url || ''} />
        <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">
          {author.full_name?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{author.full_name}</p>
            {/* Profile Badge */}
            {displayBadge && (
              <ProfileBadge badge={displayBadge} size="sm" />
            )}
          </div>
          <p className="text-xs text-slate-400 font-medium">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    </Link>
  );
}
