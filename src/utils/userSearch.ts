import { supabase } from '@/integrations/supabase/client';

export interface UserSearchResult {
  id: string;
  full_name: string;
  profile_image_url?: string;
}

export const searchUsers = async (query: string, currentUserId?: string): Promise<UserSearchResult[]> => {
  if (query.length < 2 && query.length > 0) return [];
  
  let supabaseQuery = supabase
    .from('profiles')
    .select('id, full_name, profile_image_url')
    .ilike('full_name', query.length > 0 ? `%${query}%` : '%')
    .order('full_name')
    .limit(query.length > 0 ? 10 : 20); // Read More users for empty query
  
  // Only exclude current user if provided
  if (currentUserId) {
    supabaseQuery = supabaseQuery.neq('id', currentUserId);
  }
  
  const { data, error } = await supabaseQuery;
  
  if (error) {
    console.error('Error searching users:', error);
    return [];
  }
  
  return (data as UserSearchResult[]) || [];
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
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, profile_image_url')
    .in('full_name', names);
  
  if (error) {
    console.error('Error finding users by names:', error);
    return [];
  }
  
  return (data as UserSearchResult[]) || [];
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