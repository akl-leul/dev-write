import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface BookmarkContextType {
  bookmarkedPostIds: Set<string>;
  bookmarkCounts: { [postId: string]: number };
  toggleBookmark: (postId: string) => Promise<void>;
  isBookmarked: (postId: string) => boolean;
  getBookmarkCount: (postId: string) => number;
  refreshBookmarks: () => Promise<void>;
  refreshBookmarkCounts: (postIds: string[]) => Promise<void>;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

export const useBookmarks = () => {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error('useBookmarks must be used within a BookmarkProvider');
  }
  return context;
};

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState<Set<string>>(new Set());
  const [bookmarkCounts, setBookmarkCounts] = useState<{ [postId: string]: number }>({});
  const { user } = useAuth();

  // Fetch user's bookmarks
  const fetchUserBookmarks = useCallback(async () => {
    if (!user) {
      setBookmarkedPostIds(new Set());
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('post_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const bookmarkedIds = new Set((data || []).map(b => b.post_id));
      setBookmarkedPostIds(bookmarkedIds);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  }, [user]);

  // Fetch bookmark counts for specific posts
  const fetchBookmarkCounts = useCallback(async (postIds: string[]) => {
    if (postIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('post_id')
        .in('post_id', postIds);

      if (error) throw error;

      const counts: { [postId: string]: number } = {};
      postIds.forEach(id => {
        counts[id] = 0;
      });

      (data || []).forEach(bookmark => {
        counts[bookmark.post_id] = (counts[bookmark.post_id] || 0) + 1;
      });

      setBookmarkCounts(prev => ({ ...prev, ...counts }));
    } catch (error) {
      console.error('Error fetching bookmark counts:', error);
    }
  }, []);

  // Toggle bookmark with optimistic update
  const toggleBookmark = useCallback(async (postId: string) => {
    if (!user) return;

    const isCurrentlyBookmarked = bookmarkedPostIds.has(postId);
    const currentCount = bookmarkCounts[postId] || 0;

    // Optimistic update
    const newBookmarkedIds = new Set(bookmarkedPostIds);
    if (isCurrentlyBookmarked) {
      newBookmarkedIds.delete(postId);
      setBookmarkCounts(prev => ({ ...prev, [postId]: Math.max(0, currentCount - 1) }));
    } else {
      newBookmarkedIds.add(postId);
      setBookmarkCounts(prev => ({ ...prev, [postId]: currentCount + 1 }));
    }
    setBookmarkedPostIds(newBookmarkedIds);

    try {
      if (isCurrentlyBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        if (error) throw error;
      } else {
        // Add bookmark - check if already exists to avoid duplicate constraint error
        const { data: existing } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('user_id', user.id)
          .eq('post_id', postId)
          .single();

        if (!existing) {
          const { error } = await supabase
            .from('bookmarks')
            .insert({
              user_id: user.id,
              post_id: postId,
            });

          if (error) throw error;
        }
      }

      // Refresh counts to ensure accuracy
      await fetchBookmarkCounts([postId]);
    } catch (error) {
      // Rollback on error
      setBookmarkedPostIds(bookmarkedPostIds);
      setBookmarkCounts(prev => ({ ...prev, [postId]: currentCount }));
      console.error('Toggle bookmark error:', error);
      throw error;
    }
  }, [user, bookmarkedPostIds, bookmarkCounts, fetchBookmarkCounts]);

  const isBookmarked = useCallback((postId: string) => {
    return bookmarkedPostIds.has(postId);
  }, [bookmarkedPostIds]);

  const getBookmarkCount = useCallback((postId: string) => {
    return bookmarkCounts[postId] || 0;
  }, [bookmarkCounts]);

  const refreshBookmarks = useCallback(async () => {
    await fetchUserBookmarks();
  }, [fetchUserBookmarks]);

  const refreshBookmarkCounts = useCallback(async (postIds: string[]) => {
    await fetchBookmarkCounts(postIds);
  }, [fetchBookmarkCounts]);

  // Load bookmarks when user changes
  useEffect(() => {
    fetchUserBookmarks();
  }, [fetchUserBookmarks]);

  const value: BookmarkContextType = {
    bookmarkedPostIds,
    bookmarkCounts,
    toggleBookmark,
    isBookmarked,
    getBookmarkCount,
    refreshBookmarks,
    refreshBookmarkCounts,
  };

  return <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>;
};

