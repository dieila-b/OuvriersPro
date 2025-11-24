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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      op_ouvrier_contacts: {
        Row: {
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          message: string
          origin: string | null
          phone: string | null
          status: string
          worker_id: string
          worker_name: string | null
        }
        Insert: {
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          message: string
          origin?: string | null
          phone?: string | null
          status?: string
          worker_id: string
          worker_name?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          message?: string
          origin?: string | null
          phone?: string | null
          status?: string
          worker_id?: string
          worker_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "op_ouvrier_contacts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers"
            referencedColumns: ["id"]
          },
        ]
      }
      op_ouvrier_reviews: {
        Row: {
          author_name: string | null
          comment: string | null
          created_at: string | null
          id: string
          rating: number | null
          worker_id: string
        }
        Insert: {
          author_name?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          worker_id: string
        }
        Update: {
          author_name?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_ouvrier_reviews_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers"
            referencedColumns: ["id"]
          },
        ]
      }
      op_ouvriers: {
        Row: {
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          city: string | null
          commune: string | null
          country: string | null
          created_at: string
          currency: string | null
          description: string | null
          district: string | null
          email: string | null
          experience_years: number | null
          first_name: string | null
          headline: string | null
          hourly_rate: number | null
          id: string
          last_name: string | null
          latitude: number | null
          longitude: number | null
          payment_at: string | null
          payment_provider: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["op_payment_status"]
          phone: string | null
          plan_code: string | null
          postal_code: string | null
          profession: string | null
          rating_count: number | null
          region: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["op_worker_status"]
          updated_at: string | null
          user_id: string | null
          validated_at: string | null
          validated_by: string | null
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          city?: string | null
          commune?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          district?: string | null
          email?: string | null
          experience_years?: number | null
          first_name?: string | null
          headline?: string | null
          hourly_rate?: number | null
          id?: string
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          payment_at?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["op_payment_status"]
          phone?: string | null
          plan_code?: string | null
          postal_code?: string | null
          profession?: string | null
          rating_count?: number | null
          region?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["op_worker_status"]
          updated_at?: string | null
          user_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          city?: string | null
          commune?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          district?: string | null
          email?: string | null
          experience_years?: number | null
          first_name?: string | null
          headline?: string | null
          hourly_rate?: number | null
          id?: string
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          payment_at?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["op_payment_status"]
          phone?: string | null
          plan_code?: string | null
          postal_code?: string | null
          profession?: string | null
          rating_count?: number | null
          region?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["op_worker_status"]
          updated_at?: string | null
          user_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "op_ouvriers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "op_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_ouvriers_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "op_users"
            referencedColumns: ["id"]
          },
        ]
      }
      op_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string
          customer_phone: string | null
          external_ref: string | null
          id: string
          metadata: Json
          note: string | null
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
          plan_code: string
          status: Database["public"]["Enums"]["payment_status_enum"]
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_email: string
          customer_phone?: string | null
          external_ref?: string | null
          id?: string
          metadata?: Json
          note?: string | null
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
          plan_code: string
          status?: Database["public"]["Enums"]["payment_status_enum"]
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string
          customer_phone?: string | null
          external_ref?: string | null
          id?: string
          metadata?: Json
          note?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method_enum"]
          plan_code?: string
          status?: Database["public"]["Enums"]["payment_status_enum"]
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "op_payments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers"
            referencedColumns: ["id"]
          },
        ]
      }
      op_services: {
        Row: {
          category: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          category?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          category?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      op_subscription_plans: {
        Row: {
          code: string
          created_at: string
          description: string | null
          duration_months: number
          id: string
          is_active: boolean
          is_featured: boolean
          max_services: number | null
          name: string
          price_monthly: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          duration_months?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          max_services?: number | null
          name: string
          price_monthly?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          duration_months?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          max_services?: number | null
          name?: string
          price_monthly?: number
        }
        Relationships: []
      }
      op_users: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      op_worker_services: {
        Row: {
          currency: string
          description: string | null
          id: string
          max_price: number | null
          min_price: number | null
          service_id: string
          worker_id: string
        }
        Insert: {
          currency?: string
          description?: string | null
          id?: string
          max_price?: number | null
          min_price?: number | null
          service_id: string
          worker_id: string
        }
        Update: {
          currency?: string
          description?: string | null
          id?: string
          max_price?: number | null
          min_price?: number | null
          service_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_worker_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "op_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_worker_services_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers"
            referencedColumns: ["id"]
          },
        ]
      }
      op_worker_subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          ends_at: string | null
          id: string
          payment_provider: string | null
          payment_reference: string | null
          plan_id: string
          starts_at: string | null
          status: Database["public"]["Enums"]["op_subscription_status"]
          worker_id: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          payment_provider?: string | null
          payment_reference?: string | null
          plan_id: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["op_subscription_status"]
          worker_id: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          payment_provider?: string | null
          payment_reference?: string | null
          plan_id?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["op_subscription_status"]
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_worker_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "op_subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_worker_subscriptions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      op_is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      op_payment_status: "unpaid" | "paid" | "failed"
      op_subscription_status: "pending" | "active" | "expired" | "canceled"
      op_user_role: "ouvrier" | "client" | "admin"
      op_worker_status: "pending" | "approved" | "rejected" | "suspended"
      payment_method_enum: "mobile_money" | "cash" | "bank_transfer" | "other"
      payment_status_enum:
        | "pending"
        | "confirmed"
        | "failed"
        | "canceled"
        | "expired"
      user_role: "user" | "admin" | "worker"
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
      op_payment_status: ["unpaid", "paid", "failed"],
      op_subscription_status: ["pending", "active", "expired", "canceled"],
      op_user_role: ["ouvrier", "client", "admin"],
      op_worker_status: ["pending", "approved", "rejected", "suspended"],
      payment_method_enum: ["mobile_money", "cash", "bank_transfer", "other"],
      payment_status_enum: [
        "pending",
        "confirmed",
        "failed",
        "canceled",
        "expired",
      ],
      user_role: ["user", "admin", "worker"],
    },
  },
} as const
