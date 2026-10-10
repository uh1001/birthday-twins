export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          body: string
          created_at: string
          id: string
          profile_id: string
          question_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          profile_id: string
          question_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          profile_id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "daily_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_entries: {
        Row: {
          body: string
          challenge_id: string
          created_at: string
          id: string
          profile_id: string
        }
        Insert: {
          body: string
          challenge_id: string
          created_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          body?: string
          challenge_id?: string
          created_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_entries_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "community_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          moment_id: string
          profile_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          moment_id: string
          profile_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          moment_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_challenges: {
        Row: {
          created_at: string
          description: string
          ends_on: string
          id: string
          starts_on: string
          title: string
          xp: number
        }
        Insert: {
          created_at?: string
          description: string
          ends_on: string
          id?: string
          starts_on: string
          title: string
          xp?: number
        }
        Update: {
          created_at?: string
          description?: string
          ends_on?: string
          id?: string
          starts_on?: string
          title?: string
          xp?: number
        }
        Relationships: []
      }
      community_events: {
        Row: {
          birth_day: number
          birth_month: number
          created_at: string
          created_by: string
          description: string | null
          id: string
          location: string | null
          starts_at: string
          title: string
        }
        Insert: {
          birth_day: number
          birth_month: number
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          location?: string | null
          starts_at: string
          title: string
        }
        Update: {
          birth_day?: number
          birth_month?: number
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          location?: string | null
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          accepted_at: string | null
          created_at: string
          follower_id: string
          following_id: string
          id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_questions: {
        Row: {
          ask_date: string
          created_at: string
          id: string
          question: string
        }
        Insert: {
          ask_date: string
          created_at?: string
          id?: string
          question: string
        }
        Update: {
          ask_date?: string
          created_at?: string
          id?: string
          question?: string
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "community_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          id: string
          moment_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          moment_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          moment_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moments: {
        Row: {
          body: string
          city: string | null
          country: string | null
          created_at: string
          id: string
          image_url: string | null
          kind: string
          media_type: string | null
          profile_id: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          body: string
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          kind?: string
          media_type?: string | null
          profile_id: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          body?: string
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          kind?: string
          media_type?: string | null
          profile_id?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          category: string
          created_at: string
          id: string
          kind: string
          link: string | null
          profile_id: string
          read_at: string | null
          title: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          profile_id: string
          read_at?: string | null
          title: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          profile_id?: string
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_private: {
        Row: {
          birth_year: number | null
          city: string | null
          country: string | null
          country_code: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          birth_year?: number | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          birth_year?: number | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          allow_messages: boolean
          avatar_url: string | null
          bio: string | null
          birth_day: number | null
          birth_month: number | null
          birth_year: number | null
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string
          first_name: string
          id: string
          interests: string[]
          is_demo: boolean
          is_private: boolean
          message_permission: string
          notification_prefs: Json
          occupation: string | null
          onboarded: boolean
          show_age: boolean
          show_birth_year: boolean
          show_in_yearbook: boolean
          show_location: boolean
          user_id: string | null
          username: string
          xp: number
        }
        Insert: {
          allow_messages?: boolean
          avatar_url?: string | null
          bio?: string | null
          birth_day?: number | null
          birth_month?: number | null
          birth_year?: number | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          first_name: string
          id?: string
          interests?: string[]
          is_demo?: boolean
          is_private?: boolean
          message_permission?: string
          notification_prefs?: Json
          occupation?: string | null
          onboarded?: boolean
          show_age?: boolean
          show_birth_year?: boolean
          show_in_yearbook?: boolean
          show_location?: boolean
          user_id?: string | null
          username: string
          xp?: number
        }
        Update: {
          allow_messages?: boolean
          avatar_url?: string | null
          bio?: string | null
          birth_day?: number | null
          birth_month?: number | null
          birth_year?: number | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          first_name?: string
          id?: string
          interests?: string[]
          is_demo?: boolean
          is_private?: boolean
          message_permission?: string
          notification_prefs?: Json
          occupation?: string | null
          onboarded?: boolean
          show_age?: boolean
          show_birth_year?: boolean
          show_in_yearbook?: boolean
          show_location?: boolean
          user_id?: string | null
          username?: string
          xp?: number
        }
        Relationships: []
      }
      reports: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          moment_id: string | null
          reason: string
          reported_id: string
          reporter_id: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          moment_id?: string | null
          reason: string
          reported_id: string
          reporter_id: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          moment_id?: string | null
          reason?: string
          reported_id?: string
          reporter_id?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          created_at: string
          id: string
          moment_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          moment_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          moment_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          action: string
          created_at: string
          id: string
          points: number
          profile_id: string
          ref_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          points: number
          profile_id: string
          ref_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          points?: number
          profile_id?: string
          ref_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      actor_name: { Args: { p: string }; Returns: string }
      are_connected: { Args: { a: string; b: string }; Returns: boolean }
      award_xp: {
        Args: {
          p_action: string
          p_daily_cap: number
          p_points: number
          p_profile: string
          p_ref: string
        }
        Returns: undefined
      }
      can_message: { Args: { target: string }; Returns: boolean }
      can_view_content: { Args: { owner: string }; Returns: boolean }
      current_profile_id: { Args: never; Returns: string }
      ensure_birthday_notification: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked_pair: { Args: { a: string; b: string }; Returns: boolean }
      is_moderator: { Args: never; Returns: boolean }
      notify: {
        Args: {
          p_actor: string
          p_body: string
          p_category: string
          p_kind: string
          p_link: string
          p_target: string
          p_title: string
        }
        Returns: undefined
      }
      viewer_blocked_from: { Args: { target: string }; Returns: boolean }
      year_twin_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
