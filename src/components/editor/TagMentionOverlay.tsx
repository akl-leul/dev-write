import React, { useEffect, useRef } from 'react';
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
  const overlayRef = useRef<HTMLDivElement>(null);
  const selectedIndexRef = useRef<number>(0);

  useEffect(() => {
    selectedIndexRef.current = 0;
  }, [searchResults]);

  const handleUserClick = (user: UserSearchResult) => {
    onSelect(user);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndexRef.current = Math.min(
        selectedIndexRef.current + 1,
        searchResults.length - 1
      );
      scrollToSelected();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndexRef.current = Math.max(selectedIndexRef.current - 1, 0);
      scrollToSelected();
    } else if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      handleUserClick(searchResults[selectedIndexRef.current]);
    }
  };

  const scrollToSelected = () => {
    const selectedElement = overlayRef.current?.querySelector(
      `[data-index="${selectedIndexRef.current}"]`
    );
    selectedElement?.scrollIntoView({ block: 'nearest' });
  };

  const handleMouseEnter = (index: number) => {
    selectedIndexRef.current = index;
  };

  if (!position) return null;

  return (
    <>
      <div
        ref={overlayRef}
        className="absolute z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto theme-transition"
        style={{
          top: `${position.top + 4}px`,
          left: `${position.left}px`,
          minWidth: '280px',
        }}
        onKeyDown={handleKeyDown}
      >
        {searchResults.length === 0 ? (
          <div className="p-3 text-sm text-slate-500 dark:text-slate-400">
            {query.length === 0 ? 'Start typing to search users...' : 
             query.length < 2 ? 'Type at least 2 characters' : 'No users found'}
          </div>
        ) : (
          searchResults.map((user, index) => (
            <div
              key={user.id}
              data-index={index}
              className={`flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${
                index === selectedIndexRef.current
                  ? 'bg-slate-100 dark:bg-slate-800'
                  : ''
              }`}
              onClick={() => handleUserClick(user)}
              onMouseEnter={() => handleMouseEnter(index)}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage 
                  src={user.profile_image_url || ''} 
                  alt={user.full_name}
                />
                <AvatarFallback className="bg-slate-900 text-white text-xs">
                  {user.full_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {user.full_name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  @{user.full_name.replace(/\s+/g, '').toLowerCase()}
                </p>
              </div>
              {index === selectedIndexRef.current && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
};
