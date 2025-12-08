import { supabase } from '@/integrations/supabase/client';

export interface UserSearchResult {
  id: string;
  full_name: string;
  profile_image_url?: string;
}

export const searchUsers = async (query: string): Promise<UserSearchResult[]> => {
  if (query.length < 2 && query.length > 0) return [];
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, profile_image_url')
    .ilike('full_name', query.length > 0 ? `%${query}%` : '%')
    .order('full_name')
    .limit(query.length > 0 ? 10 : 20); // Show more users for empty query
  
  if (error) {
    console.error('Error searching users:', error);
    return [];
  }
  
  return data || [];
};

export const extractMentions = (content: string): string[] => {
  const mentionRegex = /@([a-zA-Z0-9_]+(?:\s+[a-zA-Z0-9_]+)*)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
};

export const findUsersByNames = async (names: string[]): Promise<UserSearchResult[]> => {
  if (names.length === 0) return [];

  // Clean and normalize names (trim whitespace)
  const cleanedNames = names.map(name => name.trim()).filter(name => name.length > 0);
  if (cleanedNames.length === 0) return [];

  // Use case-insensitive matching by querying each name separately
  // This ensures reliable case-insensitive matching
  const queries = cleanedNames.map(name =>
    supabase
      .from('profiles')
      .select('id, full_name, profile_image_url')
      .ilike('full_name', name)
  );

  const results = await Promise.all(queries);
  
  // Combine all results and remove duplicates
  const allUsers = new Map<string, UserSearchResult>();
  
  results.forEach(({ data, error }, index) => {
    if (error) {
      console.error(`Error finding user by name "${cleanedNames[index]}":`, error);
      return;
    }
    
    if (data) {
      data.forEach(user => {
        if (!allUsers.has(user.id)) {
          allUsers.set(user.id, user);
        }
      });
    }
  });

  return Array.from(allUsers.values());
};

export const extractMentionsFromTags = (tags: string[]): string[] => {
  const mentions: string[] = [];
  
  tags.forEach(tag => {
    // Find all @mentions in the tag - improved regex to handle more username formats
    const mentionRegex = /@([a-zA-Z0-9_]+(?:\s+[a-zA-Z0-9_]+)*)/g;
    
    let match;
    while ((match = mentionRegex.exec(tag)) !== null) {
      mentions.push(match[1]);
    }
  });
  
  const uniqueMentions = [...new Set(mentions)]; // Remove duplicates
  return uniqueMentions;
};
