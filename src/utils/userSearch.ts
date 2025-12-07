import { supabase } from '@/integrations/supabase/client';

export interface UserSearchResult {
  id: string;
  full_name: string;
  profile_image_url?: string;
}

export const searchUsers = async (query: string, currentUserId: string): Promise<UserSearchResult[]> => {
  if (query.length < 2 && query.length > 0) return [];
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, profile_image_url')
    .ilike('full_name', query.length > 0 ? `%${query}%` : '%')
    .neq('id', currentUserId)
    .order('full_name')
    .limit(query.length > 0 ? 10 : 20); // Show more users for empty query
  
  if (error) {
    console.error('Error searching users:', error);
    return [];
  }
  
  return data || [];
};

export const extractMentions = (content: string): string[] => {
  const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
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
  
  return data || [];
};

export const extractMentionsFromTags = (tags: string[]): string[] => {
  const mentions: string[] = [];
  
  console.log('Extracting mentions from tags:', tags);
  
  tags.forEach(tag => {
    console.log('Processing tag:', tag);
    // Find all @mentions in the tag
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    console.log('Regex test for tag:', mentionRegex.test(tag));
    
    // Reset regex lastIndex
    mentionRegex.lastIndex = 0;
    
    let match;
    while ((match = mentionRegex.exec(tag)) !== null) {
      console.log('Found mention match:', match);
      console.log('Found mention:', match[1], 'in tag:', tag);
      mentions.push(match[1]);
    }
    
    if (mentions.length === 0) {
      console.log('No mentions found in tag:', tag);
    }
  });
  
  const uniqueMentions = [...new Set(mentions)]; // Remove duplicates
  console.log('Final unique mentions:', uniqueMentions);
  return uniqueMentions;
};
