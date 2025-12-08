import { useState, useEffect, useRef, useCallback } from 'react';
import { UserSearchResult } from '@/utils/userSearch';

interface MentionState {
  active: boolean;
  query: string;
  range: { start: number; end: number };
  position: { top: number; left: number } | null;
}

export const useMentions = (editorRef: React.RefObject<HTMLElement>) => {
  const [mentionState, setMentionState] = useState<MentionState>({
    active: false,
    query: '',
    range: { start: 0, end: 0 },
    position: null,
  });

  const checkForMention = useCallback(() => {
    if (!editorRef.current) return;

    // For TipTap editor, we need to check the actual text content
    const editorElement = editorRef.current.querySelector('.ProseMirror');
    if (!editorElement) return;
    
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    // Get the text content from the current node or its parent
    const currentNode = range.startContainer;
    const textContent = currentNode.nodeType === Node.TEXT_NODE 
      ? currentNode.textContent || '' 
      : currentNode.textContent || '';
    
    const cursorPos = range.startOffset;

    // Get text before cursor
    const textBefore = textContent.substring(0, cursorPos);
    const mentionMatch = textBefore.match(/@(\w+(?:\s+\w+)*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      const mentionStart = cursorPos - mentionMatch[0].length;
      
      // Get position for autocomplete relative to the editor
      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      
      setMentionState({
        active: true,
        query,
        range: { start: mentionStart, end: cursorPos },
        position: {
          top: rect.bottom - editorRect.top,
          left: rect.left - editorRect.left,
        },
      });
    } else {
      setMentionState(prev => ({
        ...prev,
        active: false,
        query: '',
        position: null,
      }));
    }
  }, [editorRef]);

  const insertMention = useCallback((user: UserSearchResult) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const currentNode = range.startContainer;
    const textContent = currentNode.nodeType === Node.TEXT_NODE 
      ? currentNode.textContent || '' 
      : currentNode.textContent || '';
    
    // Replace @query with @username
    const beforeMention = textContent.substring(0, mentionState.range.start);
    const afterMention = textContent.substring(mentionState.range.end);
    const mentionText = `@${user.full_name}`;
    
    // Create a span element for the mention
    const mentionSpan = document.createElement('span');
    mentionSpan.setAttribute('data-type', 'mention');
    mentionSpan.setAttribute('data-user-id', user.id);
    mentionSpan.setAttribute('data-username', user.full_name);
    mentionSpan.style.cssText = 'background-color: #e0f2fe; color: #0369a1; padding: 2px 4px; border-radius: 4px; font-weight: 500;';
    mentionSpan.textContent = mentionText;
    
    // Get the current text node
    if (currentNode.nodeType === Node.TEXT_NODE) {
      const parent = currentNode.parentNode;
      if (parent) {
        // Create new text nodes for before and after
        const beforeNode = document.createTextNode(beforeMention);
        const afterNode = document.createTextNode(afterMention + ' ');
        
        // Replace the text node with mention and surrounding text
        parent.replaceChild(mentionSpan, currentNode);
        parent.insertBefore(beforeNode, mentionSpan);
        parent.insertBefore(afterNode, mentionSpan.nextSibling);
        
        // Set cursor after the mention
        const newRange = document.createRange();
        newRange.setStart(afterNode, afterNode.length);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
      // If we're in an element node, insert the mention directly
      const textNode = document.createTextNode(beforeMention);
      currentNode.replaceChild(textNode, currentNode.firstChild);
      currentNode.insertBefore(mentionSpan, textNode.nextSibling);
      const afterNode = document.createTextNode(afterMention + ' ');
      currentNode.insertBefore(afterNode, mentionSpan.nextSibling);
      
      // Set cursor after the mention
      const newRange = document.createRange();
      newRange.setStart(afterNode, afterNode.length);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    
    // Reset mention state
    setMentionState({
      active: false,
      query: '',
      range: { start: 0, end: 0 },
      position: null,
    });
  }, [editorRef, mentionState.range]);

  const closeMentions = useCallback(() => {
    setMentionState(prev => ({
      ...prev,
      active: false,
      query: '',
      position: null,
    }));
  }, []);

  return {
    mentionState,
    checkForMention,
    insertMention,
    closeMentions,
  };
};
