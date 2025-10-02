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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          details: Json | null
          id: string
          timestamp: string
          user_id: string
        }
        Insert: {
          action: string
          details?: Json | null
          id?: string
          timestamp?: string
          user_id: string
        }
        Update: {
          action?: string
          details?: Json | null
          id?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_actions: {
        Row: {
          action_details: Json
          action_type: string
          created_at: string
          id: string
          plan_id: string | null
          project_id: string
          resources_used: string[] | null
          result: string | null
          step_index: number | null
          step_name: string | null
          user_id: string
        }
        Insert: {
          action_details?: Json
          action_type: string
          created_at?: string
          id?: string
          plan_id?: string | null
          project_id: string
          resources_used?: string[] | null
          result?: string | null
          step_index?: number | null
          step_name?: string | null
          user_id: string
        }
        Update: {
          action_details?: Json
          action_type?: string
          created_at?: string
          id?: string
          plan_id?: string | null
          project_id?: string
          resources_used?: string[] | null
          result?: string | null
          step_index?: number | null
          step_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_progress_reports: {
        Row: {
          actions_covered: string[] | null
          created_at: string
          id: string
          metadata: Json | null
          plan_id: string | null
          project_id: string
          report_markdown: string
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actions_covered?: string[] | null
          created_at?: string
          id?: string
          metadata?: Json | null
          plan_id?: string | null
          project_id: string
          report_markdown: string
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actions_covered?: string[] | null
          created_at?: string
          id?: string
          metadata?: Json | null
          plan_id?: string | null
          project_id?: string
          report_markdown?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_progress_reports_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_progress_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_collaborators_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      components: {
        Row: {
          created_at: string
          description: string | null
          fichier_id: string | null
          id: string
          nom: string
          prompt: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fichier_id?: string | null
          id?: string
          nom: string
          prompt?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fichier_id?: string | null
          id?: string
          nom?: string
          prompt?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_components_fichier"
            columns: ["fichier_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_history: {
        Row: {
          content: string
          conversation_type: string
          created_at: string
          id: string
          plan_data: Json | null
          project_id: string
          role: string
          updated_at: string
          user_id: string
          visual_identity_data: Json | null
        }
        Insert: {
          content: string
          conversation_type: string
          created_at?: string
          id?: string
          plan_data?: Json | null
          project_id: string
          role: string
          updated_at?: string
          user_id: string
          visual_identity_data?: Json | null
        }
        Update: {
          content?: string
          conversation_type?: string
          created_at?: string
          id?: string
          plan_data?: Json | null
          project_id?: string
          role?: string
          updated_at?: string
          user_id?: string
          visual_identity_data?: Json | null
        }
        Relationships: []
      }
      files: {
        Row: {
          created_at: string
          id: string
          nom: string
          type: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nom: string
          type: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
          type?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          content: Json
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string
          resource_type: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_id: string
          resource_type: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          resource_type?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_chat_history: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string | null
          plan_id: string | null
          project_id: string
          questions: string[] | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string | null
          plan_id?: string | null
          project_id: string
          questions?: string[] | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string | null
          plan_id?: string | null
          project_id?: string
          questions?: string[] | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_chat_history_plan_id"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          id: string
          plan_data: Json
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_data?: Json
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_data?: Json
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          post_type: string
          project_id: string
          subject: string
          tone: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          post_type: string
          project_id: string
          subject: string
          tone: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          post_type?: string
          project_id?: string
          subject?: string
          tone?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_documentation: {
        Row: {
          created_at: string
          description: string | null
          documentation_markdown: string
          id: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          documentation_markdown: string
          id?: string
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          documentation_markdown?: string
          id?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_documentation_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          framework_details: Json | null
          id: string
          name: string
          owner_id: string
          password: string | null
          project_type: string | null
          tech_stack: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          framework_details?: Json | null
          id?: string
          name: string
          owner_id: string
          password?: string | null
          project_type?: string | null
          tech_stack?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          framework_details?: Json | null
          id?: string
          name?: string
          owner_id?: string
          password?: string | null
          project_type?: string | null
          tech_stack?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          collaboration_enabled: boolean | null
          created_at: string
          id: string
          monthly_media_uploads: number | null
          monthly_plan_generations: number | null
          monthly_visual_identity: number | null
          name: string
          storage_limit_mb: number | null
        }
        Insert: {
          collaboration_enabled?: boolean | null
          created_at?: string
          id?: string
          monthly_media_uploads?: number | null
          monthly_plan_generations?: number | null
          monthly_visual_identity?: number | null
          name: string
          storage_limit_mb?: number | null
        }
        Update: {
          collaboration_enabled?: boolean | null
          created_at?: string
          id?: string
          monthly_media_uploads?: number | null
          monthly_plan_generations?: number | null
          monthly_visual_identity?: number | null
          name?: string
          storage_limit_mb?: number | null
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          action_type: string
          created_at: string
          id: string
          month_year: string
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          month_year?: string
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          month_year?: string
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ux_audits: {
        Row: {
          created_at: string
          description: string | null
          etapes: Json
          id: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          etapes?: Json
          id?: string
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          etapes?: Json
          id?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ux_audits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_identities: {
        Row: {
          couleurs: Json | null
          created_at: string
          id: string
          polices: Json | null
          project_id: string
          styles: Json | null
          updated_at: string
        }
        Insert: {
          couleurs?: Json | null
          created_at?: string
          id?: string
          polices?: Json | null
          project_id: string
          styles?: Json | null
          updated_at?: string
        }
        Update: {
          couleurs?: Json | null
          created_at?: string
          id?: string
          polices?: Json | null
          project_id?: string
          styles?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visual_identities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_usage_limit: {
        Args: { p_action_type: string; p_user_id: string }
        Returns: boolean
      }
      delete_post: {
        Args: { p_post_id: string }
        Returns: boolean
      }
      get_conversation_history: {
        Args: {
          p_conversation_type: string
          p_project_id: string
          p_user_id: string
        }
        Returns: {
          content: string
          created_at: string
          id: string
          plan_data: Json
          role: string
          visual_identity_data: Json
        }[]
      }
      get_plan_chat_history: {
        Args: { p_plan_id?: string; p_project_id: string; p_user_id: string }
        Returns: {
          content: string
          created_at: string
          id: string
          message_type: string
          plan_id: string
          questions: string[]
          role: string
        }[]
      }
      get_posts_for_project: {
        Args: { p_project_id: string }
        Returns: {
          content: string
          created_at: string
          id: string
          metadata: Json
          post_type: string
          project_id: string
          subject: string
          tone: string
          updated_at: string
          user_id: string
        }[]
      }
      get_user_plan_limits: {
        Args: { user_email: string }
        Returns: {
          collaboration_enabled: boolean
          monthly_media_uploads: number
          monthly_plan_generations: number
          monthly_post_generations: number
          monthly_visual_identity: number
          plan_name: string
          storage_limit_mb: number
        }[]
      }
      notify_plan_completion: {
        Args: { p_plan_id: string; p_plan_title: string; p_user_id: string }
        Returns: string
      }
      notify_plan_step_completion: {
        Args: {
          p_plan_id: string
          p_step_index: number
          p_step_name: string
          p_total_steps: number
          p_user_id: string
        }
        Returns: string
      }
      record_usage: {
        Args: {
          p_action_type: string
          p_project_id?: string
          p_user_id: string
        }
        Returns: boolean
      }
      save_conversation_message: {
        Args: {
          p_content: string
          p_conversation_type: string
          p_plan_data?: string
          p_project_id: string
          p_role: string
          p_user_id: string
          p_visual_identity_data?: string
        }
        Returns: string
      }
      save_plan_chat_message: {
        Args: {
          p_content: string
          p_message_type?: string
          p_plan_id?: string
          p_project_id: string
          p_questions?: string[]
          p_role: string
          p_user_id: string
        }
        Returns: string
      }
      user_can_access_project: {
        Args: { _project_id: string }
        Returns: boolean
      }
      user_owns_project: {
        Args: { _project_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
