import { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase: SupabaseClient = new SupabaseClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          age: number | null;
          gender: string | null;
          phone: string | null;
          bio: string | null;
          profile_image_url: string | null;
          created_at: string;
          updated_at: string;
          badge: string | null;
          twitter: string | null;
          facebook: string | null;
          linkedin: string | null;
          instagram: string | null;
          github: string | null;
          youtube: string | null;
          website: string | null;
          show_phone: boolean;
          background_image_url: string | null;
          blocked: boolean;
          role: string;
          is_active: boolean;
          last_login_at: string | null;
          login_count: number;
          permissions: any;
          role_assigned_at: string | null;
          role_assigned_by: string | null;
        };
        Insert: {
          id: string;
          full_name: string;
          age?: number | null;
          gender?: string | null;
          phone?: string | null;
          bio?: string | null;
          profile_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
          badge?: string | null;
          twitter?: string | null;
          facebook?: string | null;
          linkedin?: string | null;
          instagram?: string | null;
          github?: string | null;
          youtube?: string | null;
          website?: string | null;
          show_phone?: boolean;
          background_image_url?: string | null;
          blocked?: boolean;
          role?: string;
          is_active?: boolean;
          last_login_at?: string | null;
          login_count?: number;
          permissions?: any;
          role_assigned_at?: string | null;
          role_assigned_by?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string;
          age?: number | null;
          gender?: string | null;
          phone?: string | null;
          bio?: string | null;
          profile_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
          badge?: string | null;
          twitter?: string | null;
          facebook?: string | null;
          linkedin?: string | null;
          instagram?: string | null;
          github?: string | null;
          youtube?: string | null;
          website?: string | null;
          show_phone?: boolean;
          background_image_url?: string | null;
          blocked?: boolean;
          role?: string;
          is_active?: boolean;
          last_login_at?: string | null;
          login_count?: number;
          permissions?: any;
          role_assigned_at?: string | null;
          role_assigned_by?: string | null;
        };
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          slug: string;
          content_markdown: string;
          excerpt: string | null;
          status: string;
          created_at: string;
          updated_at: string;
          views: number;
          read_time: number;
          featured_image: string | null;
          category_id: string | null;
          allow_comments: boolean | null;
          comments_enabled: boolean;
          is_published: boolean;
          views_count: number | null;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          slug?: string;
          content_markdown: string;
          excerpt?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
          views?: number;
          read_time?: number;
          featured_image?: string | null;
          category_id?: string | null;
          allow_comments?: boolean | null;
          comments_enabled?: boolean;
          is_published?: boolean;
          views_count?: number | null;
        };
        Update: {
          id?: string;
          author_id?: string;
          title?: string;
          slug?: string;
          content_markdown?: string;
          excerpt?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
          views?: number;
          read_time?: number;
          featured_image?: string | null;
          category_id?: string | null;
          allow_comments?: boolean | null;
          comments_enabled?: boolean;
          is_published?: boolean;
          views_count?: number | null;
        };
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          parent_comment_id: string | null;
          content_markdown: string;
          created_at: string;
          updated_at: string;
          approved: boolean;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          parent_comment_id?: string | null;
          content_markdown: string;
          created_at?: string;
          updated_at?: string;
          approved?: boolean;
        };
        Update: {
          id?: string;
          post_id?: string;
          author_id?: string;
          parent_comment_id?: string | null;
          content_markdown?: string;
          created_at?: string;
          updated_at?: string;
          approved?: boolean;
        };
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          created_at?: string;
        };
      };
      followers: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data: any;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data?: any;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          data?: any;
          read?: boolean;
          created_at?: string;
        };
      };
    };
  };
}

// Type helpers
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Post = Database['public']['Tables']['posts']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type Bookmark = Database['public']['Tables']['bookmarks']['Row'];
export type Follower = Database['public']['Tables']['followers']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

// Joined types
export type PostWithProfile = Post & {
  profiles: Profile | null;
  categories: { id: string; name: string; slug: string } | null;
  post_images: { id: string; url: string; alt_text: string | null; order_index: number }[];
  likes: { count: number }[];
  comments: { count: number }[];
  post_tags: { tags: { id: string; name: string; slug: string; color: string | null } }[];
};
export type CommentWithProfile = Comment & {
  profiles: Profile | null;
  posts: Post | null;
};
