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
          full_name: string | null
          age: number | null
          gender: string | null
          phone: string | null
          bio: string | null
          profile_image_url: string | null
          created_at: string
          badge: string | null
          blocked: boolean
        }
        Insert: {
          id?: string
          full_name?: string | null
          age?: number | null
          gender?: string | null
          phone?: string | null
          bio?: string | null
          profile_image_url?: string | null
          created_at?: string
          badge?: string | null
          blocked?: boolean
        }
        Update: {
          id?: string
          full_name?: string | null
          age?: number | null
          gender?: string | null
          phone?: string | null
          bio?: string | null
          profile_image_url?: string | null
          created_at?: string
          badge?: string | null
          blocked?: boolean
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          slug: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          color: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          color?: string
          created_at?: string
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
          status: "draft" | "published" | "archived"
          created_at: string
          updated_at: string
          views: number
          read_time: number
          featured_image: string | null
          category_id: string | null
          allow_comments: boolean
          comments_enabled: boolean
          is_published: boolean
          views_count: number
        }
        Insert: {
          id?: string
          author_id: string
          title: string
          slug: string
          content_markdown: string
          excerpt?: string | null
          status?: "draft" | "published" | "archived"
          created_at?: string
          updated_at?: string
          views?: number
          read_time?: number
          featured_image?: string | null
          category_id?: string | null
          allow_comments?: boolean
          comments_enabled?: boolean
          is_published?: boolean
          views_count?: number
        }
        Update: {
          id?: string
          author_id?: string
          title?: string
          slug?: string
          content_markdown?: string
          excerpt?: string | null
          status?: "draft" | "published" | "archived"
          created_at?: string
          updated_at?: string
          views?: number
          read_time?: number
          featured_image?: string | null
          category_id?: string | null
          allow_comments?: boolean
          comments_enabled?: boolean
          is_published?: boolean
          views_count?: number
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
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          read?: boolean
          created_at?: string
        }
      }
      likes: {
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
      followers: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
