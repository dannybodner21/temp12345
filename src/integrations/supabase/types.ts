export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_date: string
          created_at: string
          customer_notes: string | null
          deposit_amount: number | null
          deposit_paid: boolean | null
          deposit_payment_intent_id: string | null
          final_cost: number | null
          final_payment_intent_id: string | null
          final_payment_status: string | null
          id: string
          provider_notes: string | null
          provider_notes_internal: string | null
          service_id: string
          status: string | null
          time_slot_id: string
          total_price: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          booking_date?: string
          created_at?: string
          customer_notes?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_payment_intent_id?: string | null
          final_cost?: number | null
          final_payment_intent_id?: string | null
          final_payment_status?: string | null
          id?: string
          provider_notes?: string | null
          provider_notes_internal?: string | null
          service_id: string
          status?: string | null
          time_slot_id: string
          total_price: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          booking_date?: string
          created_at?: string
          customer_notes?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_payment_intent_id?: string | null
          final_cost?: number | null
          final_payment_intent_id?: string | null
          final_payment_status?: string | null
          id?: string
          provider_notes?: string | null
          provider_notes_internal?: string | null
          service_id?: string
          status?: string | null
          time_slot_id?: string
          total_price?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payment_methods: {
        Row: {
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          created_at: string
          id: string
          is_default: boolean | null
          payment_method_type: string
          stripe_customer_id: string
          stripe_payment_method_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          payment_method_type: string
          stripe_customer_id: string
          stripe_payment_method_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          payment_method_type?: string
          stripe_customer_id?: string
          stripe_payment_method_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          profile_image_url: string | null
          state: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          profile_image_url?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          profile_image_url?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      provider_platform_connections: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          platform: Database["public"]["Enums"]["booking_platform"]
          platform_specific_data: Json | null
          platform_user_id: string | null
          provider_id: string
          refresh_token: string | null
          scope: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          platform: Database["public"]["Enums"]["booking_platform"]
          platform_specific_data?: Json | null
          platform_user_id?: string | null
          provider_id: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          platform?: Database["public"]["Enums"]["booking_platform"]
          platform_specific_data?: Json | null
          platform_user_id?: string | null
          provider_id?: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_square_connections: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          provider_id: string
          refresh_token: string | null
          scope: string | null
          square_application_id: string
          square_merchant_id: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          provider_id: string
          refresh_token?: string | null
          scope?: string | null
          square_application_id: string
          square_merchant_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          provider_id?: string
          refresh_token?: string | null
          scope?: string | null
          square_application_id?: string
          square_merchant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_square_connections_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_stripe_connections: {
        Row: {
          account_status: string | null
          charges_enabled: boolean | null
          created_at: string
          id: string
          is_active: boolean
          payouts_enabled: boolean | null
          provider_id: string
          stripe_account_id: string
          updated_at: string
        }
        Insert: {
          account_status?: string | null
          charges_enabled?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean
          payouts_enabled?: boolean | null
          provider_id: string
          stripe_account_id: string
          updated_at?: string
        }
        Update: {
          account_status?: string | null
          charges_enabled?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean
          payouts_enabled?: boolean | null
          provider_id?: string
          stripe_account_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scraped_services_data: {
        Row: {
          created_at: string
          extracted_services: Json
          id: string
          provider_id: string
          raw_html: string | null
          source_url: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          extracted_services?: Json
          id?: string
          provider_id: string
          raw_html?: string | null
          source_url: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          extracted_services?: Json
          id?: string
          provider_id?: string
          raw_html?: string | null
          source_url?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_scraped_services_provider"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_category_mappings: {
        Row: {
          category_id: string
          created_at: string
          id: string
          service_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          service_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          service_id?: string
        }
        Relationships: []
      }
      service_providers: {
        Row: {
          accepts_text_messages: boolean
          address: string
          business_name: string
          city: string
          created_at: string
          default_discount_percentage: number | null
          description: string | null
          email: string | null
          google_maps_url: string | null
          id: string
          instagram_handle: string | null
          instagram_url: string | null
          is_active: boolean | null
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          notification_preference: string | null
          open_days: string[] | null
          phone: string | null
          profile_image_url: string | null
          push_notifications_enabled: boolean
          requires_service_approval: boolean | null
          share_instagram: boolean | null
          share_phone: boolean | null
          state: string
          updated_at: string
          user_id: string | null
          website_url: string | null
          zip_code: string
        }
        Insert: {
          accepts_text_messages?: boolean
          address: string
          business_name: string
          city: string
          created_at?: string
          default_discount_percentage?: number | null
          description?: string | null
          email?: string | null
          google_maps_url?: string | null
          id?: string
          instagram_handle?: string | null
          instagram_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          notification_preference?: string | null
          open_days?: string[] | null
          phone?: string | null
          profile_image_url?: string | null
          push_notifications_enabled?: boolean
          requires_service_approval?: boolean | null
          share_instagram?: boolean | null
          share_phone?: boolean | null
          state: string
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
          zip_code: string
        }
        Update: {
          accepts_text_messages?: boolean
          address?: string
          business_name?: string
          city?: string
          created_at?: string
          default_discount_percentage?: number | null
          description?: string | null
          email?: string | null
          google_maps_url?: string | null
          id?: string
          instagram_handle?: string | null
          instagram_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          notification_preference?: string | null
          open_days?: string[] | null
          phone?: string | null
          profile_image_url?: string | null
          push_notifications_enabled?: boolean
          requires_service_approval?: boolean | null
          share_instagram?: boolean | null
          share_phone?: boolean | null
          state?: string
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          allows_post_appointment_adjustment: boolean | null
          category_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_available: boolean | null
          max_bookings_per_day: number | null
          name: string
          offer_on_platform: boolean
          original_price: number | null
          original_price_per_unit: number | null
          platform_service_id: string | null
          price: number | null
          price_per_unit: number | null
          provider_id: string
          sync_metadata: Json | null
          sync_source: string | null
          updated_at: string
        }
        Insert: {
          allows_post_appointment_adjustment?: boolean | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          max_bookings_per_day?: number | null
          name: string
          offer_on_platform?: boolean
          original_price?: number | null
          original_price_per_unit?: number | null
          platform_service_id?: string | null
          price?: number | null
          price_per_unit?: number | null
          provider_id: string
          sync_metadata?: Json | null
          sync_source?: string | null
          updated_at?: string
        }
        Update: {
          allows_post_appointment_adjustment?: boolean | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          max_bookings_per_day?: number | null
          name?: string
          offer_on_platform?: boolean
          original_price?: number | null
          original_price_per_unit?: number | null
          platform_service_id?: string | null
          price?: number | null
          price_per_unit?: number | null
          provider_id?: string
          sync_metadata?: Json | null
          sync_source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      synced_appointments: {
        Row: {
          appointment_date: string
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          duration_minutes: number | null
          id: string
          is_available: boolean
          notes: string | null
          offer_on_platform: boolean
          platform: Database["public"]["Enums"]["booking_platform"]
          platform_appointment_id: string
          platform_specific_data: Json | null
          provider_id: string
          service_name: string | null
          status: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          duration_minutes?: number | null
          id?: string
          is_available?: boolean
          notes?: string | null
          offer_on_platform?: boolean
          platform: Database["public"]["Enums"]["booking_platform"]
          platform_appointment_id: string
          platform_specific_data?: Json | null
          provider_id: string
          service_name?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          duration_minutes?: number | null
          id?: string
          is_available?: boolean
          notes?: string | null
          offer_on_platform?: boolean
          platform?: Database["public"]["Enums"]["booking_platform"]
          platform_appointment_id?: string
          platform_specific_data?: Json | null
          provider_id?: string
          service_name?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      time_slots: {
        Row: {
          created_at: string
          date: string
          end_time: string
          id: string
          is_available: boolean | null
          platform_appointment_id: string | null
          service_id: string
          start_time: string
          sync_metadata: Json | null
          sync_source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time: string
          id?: string
          is_available?: boolean | null
          platform_appointment_id?: string | null
          service_id: string
          start_time: string
          sync_metadata?: Json | null
          sync_source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          is_available?: boolean | null
          platform_appointment_id?: string | null
          service_id?: string
          start_time?: string
          sync_metadata?: Json | null
          sync_source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_slots_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      token_refresh_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          providers_processed: number | null
          refresh_type: string
          success: boolean
          tokens_failed: number | null
          tokens_refreshed: number | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          providers_processed?: number | null
          refresh_type: string
          success: boolean
          tokens_failed?: number | null
          tokens_refreshed?: number | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          providers_processed?: number | null
          refresh_type?: string
          success?: boolean
          tokens_failed?: number | null
          tokens_refreshed?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      trigger_token_refresh: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      booking_platform: "square" | "vagaro" | "boulevard" | "zenoti" | "setmore"
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
      booking_platform: ["square", "vagaro", "boulevard", "zenoti", "setmore"],
    },
  },
} as const
