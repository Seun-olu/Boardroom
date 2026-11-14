// Generated from the boardroom-dev Supabase schema (supabase/migrations/*).
// Regenerate after schema changes; do not edit by hand.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          action: string
          actor_id: string | null
          board_id: string
          created_at: string
          entity: string
          entity_id: string
          id: number
          summary: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          board_id: string
          created_at?: string
          entity: string
          entity_id: string
          id?: never
          summary?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          board_id?: string
          created_at?: string
          entity?: string
          entity_id?: string
          id?: never
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      board_columns: {
        Row: {
          board_id: string
          color: string
          created_at: string
          created_by: string | null
          id: string
          position: number
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          board_id: string
          color: string
          created_at?: string
          created_by?: string | null
          id?: string
          position: number
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          board_id?: string
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          position?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "board_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
          updated_by: string | null
          version: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      card_comments: {
        Row: {
          author_id: string
          board_id: string
          body: string
          card_id: string
          created_at: string
          edited_at: string | null
          id: string
        }
        Insert: {
          author_id?: string
          board_id: string
          body: string
          card_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
        }
        Update: {
          author_id?: string
          board_id?: string
          body?: string
          card_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_comments_card_id_board_id_fkey"
            columns: ["card_id", "board_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id", "board_id"]
          },
        ]
      }
      cards: {
        Row: {
          assignee_id: string | null
          board_id: string
          column_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          position: number
          priority: Database["public"]["Enums"]["card_priority"]
          story_points: number | null
          subtasks: Json
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          assignee_id?: string | null
          board_id: string
          column_id: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          position: number
          priority?: Database["public"]["Enums"]["card_priority"]
          story_points?: number | null
          subtasks?: Json
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          assignee_id?: string | null
          board_id?: string
          column_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["card_priority"]
          story_points?: number | null
          subtasks?: Json
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_column_id_board_id_fkey"
            columns: ["column_id", "board_id"]
            isOneToOne: false
            referencedRelation: "board_columns"
            referencedColumns: ["id", "board_id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          board_id: string
          card_id: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          summary: Json
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          board_id: string
          card_id?: string | null
          created_at?: string
          id?: string
          kind: string
          read_at?: string | null
          summary?: Json
          user_id: string
        }
        Update: {
          actor_id?: string | null
          board_id?: string
          card_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          summary?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_actions: {
        Row: {
          board_id: string
          client_action_id: string
          created_at: string
          result: Json | null
          user_id: string
        }
        Insert: {
          board_id: string
          client_action_id: string
          created_at?: string
          result?: Json | null
          user_id?: string
        }
        Update: {
          board_id?: string
          client_action_id?: string
          created_at?: string
          result?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processed_actions_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_color?: string
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["workspace_role"]
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_workspace_invite: { Args: { p_token: string }; Returns: string }
      apply_board_action: {
        Args: { p_action: Json; p_board: string; p_client_action_id: string }
        Returns: Json
      }
      get_workspace_invite: {
        Args: { p_token: string }
        Returns: {
          accepted: boolean
          email_matches: boolean
          expired: boolean
          role: Database["public"]["Enums"]["workspace_role"]
          workspace_name: string
        }[]
      }
    }
    Enums: {
      card_priority: "low" | "medium" | "high" | "urgent"
      workspace_role: "owner" | "admin" | "member" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      card_priority: ["low", "medium", "high", "urgent"],
      workspace_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const
