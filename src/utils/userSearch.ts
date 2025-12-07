import { supabase } from '@/integrations/supabase/client';

export interface UserSearchResult {
  id: string;
  full_name: string;
  profile_image_url?: string;
}

export const searchUsers = async (query: string, currentUserId: string): Promise<UserSearchResult[]> => {
  if (!query.trim() || query.length < 2) return [];
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, profile_image_url')
    .ilike('full_name', `%${query}%`)
    .neq('id', currentUserId)
    .limit(10);
  
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
