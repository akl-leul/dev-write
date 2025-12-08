import React, { useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mail, Shield, User as UserIcon, Globe } from 'lucide-react';

interface OptimizedGoogleProfileProps {
  user: User;
  compact?: boolean;
}

export const OptimizedGoogleProfile: React.FC<OptimizedGoogleProfileProps> = ({ user, compact = false }) => {
  // Memoize expensive calculations
  const profileData = useMemo(() => {
    const userMetadata = user.user_metadata || {};
    const fullName = userMetadata.full_name || userMetadata.name || 'Google User';
    const nameParts = fullName.split(' ');
    const firstName = userMetadata.given_name || nameParts[0] || '';
    const lastName = userMetadata.family_name || nameParts.slice(1).join(' ') || '';
    
    return {
      fullName,
      firstName,
      lastName,
      email: user.email,
      avatarUrl: userMetadata.avatar_url || userMetadata.picture || userMetadata.image_url,
      isVerified: user.email_confirmed_at ? true : false,
      locale: userMetadata.locale,
      googleDomain: userMetadata.hd,
      initials: fullName.charAt(0).toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'
    };
  }, [user]);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profileData.avatarUrl} alt={profileData.fullName} />
          <AvatarFallback className="bg-slate-100 text-xs">
            {profileData.initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{profileData.fullName}</p>
          <p className="text-xs text-slate-500 truncate">{profileData.email}</p>
        </div>
        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
          Google
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200">
      <Avatar className="h-12 w-12">
        <AvatarImage src={profileData.avatarUrl} alt={profileData.fullName} />
        <AvatarFallback className="bg-slate-100">
          {profileData.initials}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-slate-900 truncate">{profileData.fullName}</p>
          {profileData.isVerified && (
            <Shield className="h-4 w-4 text-green-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Mail className="h-3 w-3" />
          <span className="truncate">{profileData.email}</span>
        </div>
      </div>
      
      <div className="flex flex-col gap-1">
        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
          <Globe className="h-3 w-3 mr-1" />
          Google
        </Badge>
        {profileData.isVerified && (
          <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 text-xs">
            Verified
          </Badge>
        )}
      </div>
    </div>
  );
};