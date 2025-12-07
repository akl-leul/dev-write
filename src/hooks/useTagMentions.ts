import { useState, useEffect, useRef, useCallback } from 'react';
import { UserSearchResult, searchUsers } from '@/utils/userSearch';

interface TagMentionState {
  active: boolean;
  query: string;
  startIndex: number;
  position: { top: number; left: number } | null;
}

export const useTagMentions = (
  inputRef: React.RefObject<HTMLInputElement>,
  tagInput: string,
  user: any,
  setTagInput: (value: string) => void
) => {
  const [mentionState, setMentionState] = useState<TagMentionState>({
    active: false,
    query: '',
    startIndex: 0,
    position: null,
  });
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);

  const checkForMention = useCallback(() => {
    if (!inputRef.current || !user) return;

    const cursorPos = inputRef.current.selectionStart || 0;
    const textBefore = tagInput.substring(0, cursorPos);
    
    // Look for @ symbol in the current tag input
    const mentionMatch = textBefore.match(/@(\w*(?:\s+\w*)*)?$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1] || '';
      const mentionStart = textBefore.indexOf('@' + query);
      
      // Get position for autocomplete
      const rect = inputRef.current.getBoundingClientRect();
      const inputRect = inputRef.current.getBoundingClientRect();
      
      // Calculate position based on cursor position within the input
      const textBeforeCursor = tagInput.substring(0, cursorPos);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context!.font = getComputedStyle(inputRef.current).font;
      const textWidth = context!.measureText(textBeforeCursor).width;
      
      setMentionState({
        active: true,
        query,
        startIndex: mentionStart,
        position: {
          top: rect.height,
          left: Math.min(textWidth, rect.width - 200), // Ensure dropdown doesn't go outside input
        },
      });
      
      // Search for users
      searchUsers(query, user.id).then(setSearchResults);
    } else {
      setMentionState(prev => ({
        ...prev,
        active: false,
        query: '',
        position: null,
      }));
      setSearchResults([]);
    }
  }, [inputRef, tagInput, user]);

  const insertMention = useCallback((user: UserSearchResult) => {
    if (!inputRef.current) return;

    const cursorPos = inputRef.current.selectionStart || 0;
    const beforeMention = tagInput.substring(0, mentionState.startIndex);
    const afterMention = tagInput.substring(cursorPos);
    
    // Replace @query with @username
    const newTagInput = beforeMention + `@${user.full_name}` + afterMention;
    
    // Update the React state
    setTagInput(newTagInput);
    
    // Update the input value directly for immediate feedback
    inputRef.current.value = newTagInput;
    const newCursorPos = beforeMention.length + user.full_name.length + 1;
    inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
    
    // Reset mention state
    setMentionState({
      active: false,
      query: '',
      startIndex: 0,
      position: null,
    });
    setSearchResults([]);
  }, [inputRef, tagInput, mentionState.startIndex, setTagInput]);

  const closeMentions = useCallback(() => {
    setMentionState(prev => ({
      ...prev,
      active: false,
      query: '',
      position: null,
    }));
    setSearchResults([]);
  }, []);

  // Auto-search when query changes
  useEffect(() => {
    if (mentionState.active && user) {
      // Show all users when @ is just typed (empty query)
      if (mentionState.query.length === 0) {
        searchUsers('', user.id).then(setSearchResults);
      } else if (mentionState.query.length >= 2) {
        searchUsers(mentionState.query, user.id).then(setSearchResults);
      }
    }
  }, [mentionState.query, mentionState.active, user]);

  return {
    mentionState,
    searchResults,
    checkForMention,
    insertMention,
    closeMentions,
  };
};
