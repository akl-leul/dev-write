import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';

interface UseMentionsReturn {
  showMentionOverlay: boolean;
  mentionSearchText: string;
  handleTextChange: (text: string) => void;
  insertMention: (user: any) => void;
  closeMentionOverlay: () => void;
}

export const useMentions = (initialText: string = ''): UseMentionsReturn => {
  const [showMentionOverlay, setShowMentionOverlay] = useState(false);
  const [mentionSearchText, setMentionSearchText] = useState('');
  const [text, setText] = useState(initialText);
  const [cursorPosition, setCursorPosition] = useState(0);

  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
    
    // Check if we're in a mention context
    const beforeCursor = newText.slice(0, newText.length);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setShowMentionOverlay(true);
      setMentionSearchText(mentionMatch[1]);
    } else {
      setShowMentionOverlay(false);
      setMentionSearchText('');
    }
  }, []);

  const insertMention = useCallback((user: any) => {
    const username = user.username || user.full_name || 'unknown';
    const beforeCursor = text.slice(0, text.length);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const beforeMention = beforeCursor.slice(0, -mentionMatch[0].length);
      const newText = beforeMention + `@${username} `;
      setText(newText);
      setShowMentionOverlay(false);
      setMentionSearchText('');
      return newText;
    }
    
    return text;
  }, [text]);

  const closeMentionOverlay = useCallback(() => {
    setShowMentionOverlay(false);
    setMentionSearchText('');
  }, []);

  return {
    showMentionOverlay,
    mentionSearchText,
    handleTextChange,
    insertMention,
    closeMentionOverlay,
  };
};
