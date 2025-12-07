import React, { useState, useEffect, useRef, useCallback } from 'react';
import { searchUsers, UserSearchResult } from '@/utils/userSearch';
import { useAuth } from '@/contexts/AuthContext';
import { Check } from 'lucide-react';

interface MentionAutocompleteProps {
  query: string;
  onSelect: (user: UserSearchResult) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  query,
  onSelect,
  onClose,
  position
}) => {
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUsers = useCallback(async () => {
    if (!user || query.length < 2) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      const results = await searchUsers(query, user.id);
      setUsers(results);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [query, user]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

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

  if (!query || query.length < 2) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-2 max-h-64 overflow-y-auto"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: '200px',
        maxWidth: '300px'
      }}
    >
      {loading ? (
        <div className="px-3 py-2 text-sm text-slate-500">Searching...</div>
      ) : users.length === 0 ? (
        <div className="px-3 py-2 text-sm text-slate-500">No users found</div>
      ) : (
        users.map((user, index) => (
          <div
            key={user.id}
            className={`px-3 py-2 cursor-pointer flex items-center gap-3 hover:bg-slate-50 transition-colors ${
              index === selectedIndex ? 'bg-slate-50' : ''
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
              <div className="font-medium text-slate-900 text-sm truncate">
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
