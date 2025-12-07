import React from 'react';
import { UserSearchResult } from '@/utils/userSearch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TagMentionOverlayProps {
  query: string;
  searchResults: UserSearchResult[];
  onSelect: (user: UserSearchResult) => void;
  onClose: () => void;
  position: { top: number; left: number } | null;
  inputRef: React.RefObject<HTMLInputElement>;
}

export const TagMentionOverlay: React.FC<TagMentionOverlayProps> = ({
  query,
  searchResults,
  onSelect,
  onClose,
  position,
  inputRef,
}) => {
  if (!position) return null;

  const handleUserClick = (user: UserSearchResult) => {
    onSelect(user);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <>
      <div
        className="absolute z-50 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        style={{
          top: `${position.top + 4}px`,
          left: `${position.left}px`,
          minWidth: '200px',
        }}
        onKeyDown={handleKeyDown}
      >
      {searchResults.length === 0 ? (
        <div className="p-3 text-sm text-slate-500">
          {query.length === 0 ? 'Start typing to search users...' : 
           query.length < 2 ? 'Type at least 2 characters' : 'No users found'}
        </div>
      ) : (
        searchResults.map((user, index) => (
          <div
            key={user.id}
            className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer transition-colors pb-10"
            onClick={() => handleUserClick(user)}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.profile_image_url || ''} />
              <AvatarFallback className="bg-slate-900 text-white text-xs">
                {user.full_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user.full_name}
              </p>
              <p className="text-xs text-slate-500 truncate">
                @{user.full_name.replace(/\s+/g, '').toLowerCase()}
              </p>
            </div>
          </div>
        ))
      )}
      </div>
    </>
  );
};
