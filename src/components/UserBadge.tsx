import { ProfileBadge } from './ProfileBadge';
import { useProfileBadge } from '@/hooks/useProfileBadge';

interface UserBadgeProps {
    userId: string;
    size?: 'sm' | 'md' | 'lg';
}

/**
 * A component that automatically calculates and displays a user's badge based on their activity.
 */
export const UserBadge = ({ userId, size = 'sm' }: UserBadgeProps) => {
    const { badge } = useProfileBadge({ userId });

    if (!badge) return null;

    return <ProfileBadge badge={badge} size={size} />;
};
