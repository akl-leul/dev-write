import { useState, useEffect, useRef, useCallback } from 'react';
import { UserSearchResult } from '@/utils/userSearch';
import { Editor } from '@tiptap/react';

interface MentionState {
  active: boolean;
  query: string;
  range: { from: number; to: number };
  position: { top: number; left: number } | null;
}

export const useMentions = (editorRef: React.RefObject<Editor | null>) => {
  const [mentionState, setMentionState] = useState<MentionState>({
    active: false,
    query: '',
    range: { from: 0, to: 0 },
    position: null,
  });

  const checkForMention = useCallback(() => {
    if (!editorRef.current) {
      return;
    }

    const editor = editorRef.current;
    const { selection } = editor.state;
    const { $from } = selection;

    // Get text from the start of the document to the cursor
    const textBefore = editor.state.doc.textBetween(0, $from.pos, ' ');
    const match = textBefore.match(/@(\w*(?:\s+\w*)*)?$/);

    if (match) {
      const query = match[1] || '';
      const mentionStart = $from.pos - match[0].length;
      
      // Get position for autocomplete using TipTap's coordinate system
      try {
        const coords = editor.view.coordsAtPos($from.pos);
        
        setMentionState({
          active: true,
          query,
          range: { from: mentionStart, to: $from.pos },
          position: {
            top: coords.bottom + window.scrollY,
            left: coords.left,
          },
        });
      } catch (error) {
        // Fallback position calculation
        const editorElement = editor.view.dom;
        const editorRect = editorElement.getBoundingClientRect();
        setMentionState({
          active: true,
          query,
          range: { from: mentionStart, to: $from.pos },
          position: {
            top: editorRect.bottom + window.scrollY,
            left: editorRect.left,
          },
        });
      }
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

    const editor = editorRef.current;
    const { from, to } = mentionState.range;

    // Insert the mention text
    editor
      .chain()
      .focus()
      .insertContentAt(
        { from, to },
        `<span data-type="mention" data-user-id="${user.id}" data-username="${user.full_name}" style="background-color: #e0f2fe; color: #0369a1; padding: 2px 4px; border-radius: 4px; font-weight: 500;">@${user.full_name}</span> `
      )
      .run();

    // Reset mention state
    setMentionState({
      active: false,
      query: '',
      range: { from: 0, to: 0 },
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
