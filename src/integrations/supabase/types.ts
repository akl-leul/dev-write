// Database type definitions
// This file should be auto-generated from Supabase, but we provide a basic structure here
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          age: number | null
          gender: string | null
          phone: string | null
          bio: string | null
          profile_image_url: string | null
          created_at: string
          updated_at: string
          badge: string | null
          twitter: string | null
          facebook: string | null
          linkedin: string | null
          instagram: string | null
          github: string | null
          youtube: string | null
          website: string | null
          show_phone: boolean | null
          background_image_url: string | null
          blocked: boolean | null
          role: string
          is_active: boolean | null
          last_login_at: string | null
          login_count: number | null
          permissions: Json | null
          role_assigned_at: string | null
          role_assigned_by: string | null
        }
        Insert: {
          id: string
          full_name: string
          age?: number | null
          gender?: string | null
          phone?: string | null
          bio?: string | null
          profile_image_url?: string | null
          created_at?: string
          updated_at?: string
          badge?: string | null
          twitter?: string | null
          facebook?: string | null
          linkedin?: string | null
          instagram?: string | null
          github?: string | null
          youtube?: string | null
          website?: string | null
          show_phone?: boolean | null
          background_image_url?: string | null
          blocked?: boolean | null
          role?: string
          is_active?: boolean | null
          last_login_at?: string | null
          login_count?: number | null
          permissions?: Json | null
          role_assigned_at?: string | null
          role_assigned_by?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          age?: number | null
          gender?: string | null
          phone?: string | null
          bio?: string | null
          profile_image_url?: string | null
          created_at?: string
          updated_at?: string
          badge?: string | null
          twitter?: string | null
          facebook?: string | null
          linkedin?: string | null
          instagram?: string | null
          github?: string | null
          youtube?: string | null
          website?: string | null
          show_phone?: boolean | null
          background_image_url?: string | null
          blocked?: boolean | null
          role?: string
          is_active?: boolean | null
          last_login_at?: string | null
          login_count?: number | null
          permissions?: Json | null
          role_assigned_at?: string | null
          role_assigned_by?: string | null
        }
      }
      posts: {
        Row: {
          id: string
          author_id: string
          title: string
          slug: string
          content_markdown: string
          excerpt: string | null
          status: string
          created_at: string
          updated_at: string
          views: number
          read_time: number
          featured_image: string | null
          category_id: string | null
          allow_comments: boolean | null
          comments_enabled: boolean
          is_published: boolean | null
          views_count: number | null
        }
        Insert: {
          id?: string
          author_id: string
          title: string
          slug: string
          content_markdown: string
          excerpt?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          views?: number
          read_time?: number
          featured_image?: string | null
          category_id?: string | null
          allow_comments?: boolean | null
          comments_enabled?: boolean
          is_published?: boolean | null
          views_count?: number | null
        }
        Update: {
          id?: string
          author_id?: string
          title?: string
          slug?: string
          content_markdown?: string
          excerpt?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          views?: number
          read_time?: number
          featured_image?: string | null
          category_id?: string | null
          allow_comments?: boolean | null
          comments_enabled?: boolean
          is_published?: boolean | null
          views_count?: number | null
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          author_id: string
          parent_comment_id: string | null
          content_markdown: string
          created_at: string
          updated_at: string
          approved: boolean
        }
        Insert: {
          id?: string
          post_id: string
          author_id: string
          parent_comment_id?: string | null
          content_markdown: string
          created_at?: string
          updated_at?: string
          approved?: boolean
        }
        Update: {
          id?: string
          post_id?: string
          author_id?: string
          parent_comment_id?: string | null
          content_markdown?: string
          created_at?: string
          updated_at?: string
          approved?: boolean
        }
      }
      bookmarks: {
        Row: {
          id: string
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string | null
          post_id: string | null
          from_user_id: string | null
          read: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message?: string | null
          post_id?: string | null
          from_user_id?: string | null
          read?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string | null
          post_id?: string | null
          from_user_id?: string | null
          read?: boolean
          created_at?: string
          updated_at?: string | null
        }
      }
      [key: string]: any
    }
    Views: {
      [key: string]: any
    }
    Functions: {
      [key: string]: any
    }
    Enums: {
      [key: string]: any
    }
  }
}

