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
      ads: {
        Row: {
          boost_expires_at: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_boosted: boolean
          prompt: string | null
          status: Database["public"]["Enums"]["ad_status"]
          style: Database["public"]["Enums"]["ad_style"]
          title: string
          updated_at: string
          user_id: string
          views: number
        }
        Insert: {
          boost_expires_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_boosted?: boolean
          prompt?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          style: Database["public"]["Enums"]["ad_style"]
          title: string
          updated_at?: string
          user_id: string
          views?: number
        }
        Update: {
          boost_expires_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_boosted?: boolean
          prompt?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          style?: Database["public"]["Enums"]["ad_style"]
          title?: string
          updated_at?: string
          user_id?: string
          views?: number
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          ad_id: string | null
          amount: number
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          ad_id?: string | null
          amount: number
          created_at?: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          ad_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_mt: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          method: string
          notes: string | null
          plan_id: Database["public"]["Enums"]["plan_type"]
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          amount_mt: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          plan_id: Database["public"]["Enums"]["plan_type"]
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          amount_mt?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          plan_id?: Database["public"]["Enums"]["plan_type"]
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          allowed_styles: Database["public"]["Enums"]["ad_style"][]
          credits: number
          duration_days: number
          id: Database["public"]["Enums"]["plan_type"]
          name: string
          price_mt: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          allowed_styles: Database["public"]["Enums"]["ad_style"][]
          credits: number
          duration_days: number
          id: Database["public"]["Enums"]["plan_type"]
          name: string
          price_mt: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          allowed_styles?: Database["public"]["Enums"]["ad_style"][]
          credits?: number
          duration_days?: number
          id?: Database["public"]["Enums"]["plan_type"]
          name?: string
          price_mt?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          current_plan: Database["public"]["Enums"]["plan_type"] | null
          full_name: string | null
          id: string
          phone: string | null
          plan_expires_at: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          current_plan?: Database["public"]["Enums"]["plan_type"] | null
          full_name?: string | null
          id?: string
          phone?: string | null
          plan_expires_at?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          current_plan?: Database["public"]["Enums"]["plan_type"] | null
          full_name?: string | null
          id?: string
          phone?: string | null
          plan_expires_at?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id?: string
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
      approve_payment: { Args: { _payment_id: string }; Returns: undefined }
      consume_credit: {
        Args: { _ad_id?: string; _reason: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refresh_user_status: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      ad_status: "active" | "paused" | "expired"
      ad_style:
        | "classic"
        | "promotional"
        | "nature"
        | "3d_realistic"
        | "3d_blur"
        | "luxury"
        | "4k_ultra"
      app_role: "admin" | "user"
      payment_status: "pending" | "approved" | "rejected"
      plan_type: "daily" | "weekly" | "monthly"
      user_status: "active" | "expiring" | "blocked"
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
      ad_status: ["active", "paused", "expired"],
      ad_style: [
        "classic",
        "promotional",
        "nature",
        "3d_realistic",
        "3d_blur",
        "luxury",
        "4k_ultra",
      ],
      app_role: ["admin", "user"],
      payment_status: ["pending", "approved", "rejected"],
      plan_type: ["daily", "weekly", "monthly"],
      user_status: ["active", "expiring", "blocked"],
    },
  },
} as const
