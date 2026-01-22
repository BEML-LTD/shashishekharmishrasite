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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      coach_formations: {
        Row: {
          capacity: number
          class: string
          coach_number: string
          configuration: string
          created_at: string
          id: string
          position: number
          train_id: string
          unit: string
        }
        Insert: {
          capacity: number
          class: string
          coach_number: string
          configuration: string
          created_at?: string
          id?: string
          position: number
          train_id: string
          unit: string
        }
        Update: {
          capacity?: number
          class?: string
          coach_number?: string
          configuration?: string
          created_at?: string
          id?: string
          position?: number
          train_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_formations_train_id_fkey"
            columns: ["train_id"]
            isOneToOne: false
            referencedRelation: "trains"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          action_during_service: string | null
          action_plan: string
          action_required_in_yard: string | null
          ai_diagnosis: string | null
          berth_number: string
          capacity: number
          class: string
          coach_number: string
          configuration: string
          contact_number: string | null
          created_at: string
          customer_name: string
          evidence_paths: string[]
          id: string
          issue_description: string
          pnr_number: string
          position: number
          reporter_name: string
          reporter_staff_number: string
          reporter_user_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          train_number: string
          unit: string
          updated_at: string
        }
        Insert: {
          action_during_service?: string | null
          action_plan: string
          action_required_in_yard?: string | null
          ai_diagnosis?: string | null
          berth_number: string
          capacity: number
          class: string
          coach_number: string
          configuration: string
          contact_number?: string | null
          created_at?: string
          customer_name: string
          evidence_paths?: string[]
          id?: string
          issue_description: string
          pnr_number: string
          position: number
          reporter_name: string
          reporter_staff_number: string
          reporter_user_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          train_number: string
          unit: string
          updated_at?: string
        }
        Update: {
          action_during_service?: string | null
          action_plan?: string
          action_required_in_yard?: string | null
          ai_diagnosis?: string | null
          berth_number?: string
          capacity?: number
          class?: string
          coach_number?: string
          configuration?: string
          contact_number?: string | null
          created_at?: string
          customer_name?: string
          evidence_paths?: string[]
          id?: string
          issue_description?: string
          pnr_number?: string
          position?: number
          reporter_name?: string
          reporter_staff_number?: string
          reporter_user_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          train_number?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_sync: {
        Row: {
          attempt_at: string
          complaint_id: string
          created_at: string
          id: string
          message: string | null
          status: string
        }
        Insert: {
          attempt_at?: string
          complaint_id: string
          created_at?: string
          id?: string
          message?: string | null
          status: string
        }
        Update: {
          attempt_at?: string
          complaint_id?: string
          created_at?: string
          id?: string
          message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_sync_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_roster: {
        Row: {
          active: boolean
          base_location: string | null
          created_at: string
          dept: string | null
          full_name: string
          id: string
          show_in_login: boolean
          staff_number: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_location?: string | null
          created_at?: string
          dept?: string | null
          full_name: string
          id?: string
          show_in_login?: boolean
          staff_number: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_location?: string | null
          created_at?: string
          dept?: string | null
          full_name?: string
          id?: string
          show_in_login?: boolean
          staff_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          staff_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          staff_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          staff_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trains: {
        Row: {
          created_at: string
          id: string
          train_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          train_number: string
        }
        Update: {
          created_at?: string
          id?: string
          train_number?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_in_charge: { Args: never; Returns: boolean }
      is_in_charge: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "in_charge" | "officer"
      complaint_status: "open" | "in_progress" | "resolved"
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
    Enums: {
      app_role: ["admin", "in_charge", "officer"],
      complaint_status: ["open", "in_progress", "resolved"],
    },
  },
} as const
