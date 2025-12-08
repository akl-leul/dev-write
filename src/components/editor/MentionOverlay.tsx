import React, { useState, useEffect, useRef, useCallback } from 'react';
import { searchUsers, UserSearchResult } from '@/utils/userSearch';
// import { useAuth } from '@/contexts/AuthContext'; // Removed auth dependency
import { Check } from 'lucide-react';

interface MentionOverlayProps {
  query: string;
  onSelect: (user: UserSearchResult) => void;
  onClose: () => void;
  position: { top: number; left: number };
  editorRef: React.RefObject<HTMLDivElement>;
}

export const MentionOverlay: React.FC<MentionOverlayProps> = ({
  query,
  onSelect,
  onClose,
  position,
  editorRef
}) => {
  console.log('MentionOverlay rendered with query:', query, 'position:', position);
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  // const { user } = useAuth(); // Removed auth dependency
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUsers = useCallback(async () => {
    // Show users when @ is typed (empty query) or when query is 2+ chars
    if (query.length > 0 && query.length < 2) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      const results = await searchUsers(query); // No auth dependency - currentUserId is optional
      setUsers(results);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (!editorRef.current?.contains(event.target as Node)) {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, editorRef]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => (prev + 1) % users.length);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => prev === 0 ? users.length - 1 : prev - 1);
          break;
        case 'Enter':
          event.preventDefault();
          if (users[selectedIndex]) {
            onSelect(users[selectedIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [users, selectedIndex, onSelect, onClose]);

  if (!query) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-2 max-h-64 overflow-y-auto theme-transition"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: '200px',
        maxWidth: '300px'
      }}
    >
      {loading ? (
        <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">Searching...</div>
      ) : users.length === 0 && query.length > 0 ? (
        <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No users found</div>
      ) : users.length === 0 && query === '' ? (
        <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">Type to search users...</div>
      ) : (
        users.map((user, index) => (
          <div
            key={user.id}
            className={`px-3 py-2 cursor-pointer flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
              index === selectedIndex ? 'bg-slate-50 dark:bg-slate-800' : ''
            }`}
            onClick={() => onSelect(user)}
          >
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-sm font-bold flex-shrink-0 overflow-hidden">
              {user.profile_image_url ? (
                <img
                  src={user.profile_image_url}
                  alt={user.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                user.full_name?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
                {user.full_name}
              </div>
            </div>
            {index === selectedIndex && (
              <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
            )}
          </div>
        ))
      )}
    </div>
  );
};