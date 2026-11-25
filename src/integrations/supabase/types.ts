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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string | null
          criteria_type: string
          criteria_value: number
          description: string
          icon: string
          id: string
          order_index: number | null
          title: string
          xp_reward: number | null
        }
        Insert: {
          created_at?: string | null
          criteria_type: string
          criteria_value: number
          description: string
          icon: string
          id?: string
          order_index?: number | null
          title: string
          xp_reward?: number | null
        }
        Update: {
          created_at?: string | null
          criteria_type?: string
          criteria_value?: number
          description?: string
          icon?: string
          id?: string
          order_index?: number | null
          title?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      carousel_courses: {
        Row: {
          carousel_id: string | null
          course_id: string | null
          created_at: string | null
          id: string
          order_index: number | null
        }
        Insert: {
          carousel_id?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          order_index?: number | null
        }
        Update: {
          carousel_id?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "carousel_courses_carousel_id_fkey"
            columns: ["carousel_id"]
            isOneToOne: false
            referencedRelation: "carousels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carousel_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      carousels: {
        Row: {
          cards_per_view_desktop: number | null
          cards_per_view_mobile: number | null
          cards_per_view_tablet: number | null
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          cards_per_view_desktop?: number | null
          cards_per_view_mobile?: number | null
          cards_per_view_tablet?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          cards_per_view_desktop?: number | null
          cards_per_view_mobile?: number | null
          cards_per_view_tablet?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cart_leads: {
        Row: {
          abandoned_at: string | null
          cpf: string | null
          created_at: string
          email: string
          id: string
          last_activity_at: string
          metadata: Json
          name: string | null
          phone: string | null
          product_id: string | null
          recovered_at: string | null
          stage: number
          stage_started_at: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          abandoned_at?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          id?: string
          last_activity_at?: string
          metadata?: Json
          name?: string | null
          phone?: string | null
          product_id?: string | null
          recovered_at?: string | null
          stage?: number
          stage_started_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          abandoned_at?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          last_activity_at?: string
          metadata?: Json
          name?: string | null
          phone?: string | null
          product_id?: string | null
          recovered_at?: string | null
          stage?: number
          stage_started_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_recovery_settings: {
        Row: {
          channel_email: boolean
          channel_sms: boolean
          channel_whatsapp: boolean
          enabled: boolean
          id: boolean
          stage_minutes: number[]
          templates: Json
          updated_at: string
        }
        Insert: {
          channel_email?: boolean
          channel_sms?: boolean
          channel_whatsapp?: boolean
          enabled?: boolean
          id?: boolean
          stage_minutes?: number[]
          templates?: Json
          updated_at?: string
        }
        Update: {
          channel_email?: boolean
          channel_sms?: boolean
          channel_whatsapp?: boolean
          enabled?: boolean
          id?: boolean
          stage_minutes?: number[]
          templates?: Json
          updated_at?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          course_id: string
          created_at: string
          id: string
          issued_at: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          issued_at?: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          issued_at?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          lesson_id: string | null
          parent_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          parent_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          parent_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_products: {
        Row: {
          coupon_id: string
          product_id: string
        }
        Insert: {
          coupon_id: string
          product_id: string
        }
        Update: {
          coupon_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_products_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usage: {
        Row: {
          coupon_id: string | null
          created_at: string | null
          discount_applied: number
          id: string
          order_id: string | null
          user_id: string | null
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string | null
          discount_applied: number
          id?: string
          order_id?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_id?: string | null
          created_at?: string | null
          discount_applied?: number
          id?: string
          order_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_purchase_amount: number | null
          updated_at: string | null
          uses_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_purchase_amount?: number | null
          updated_at?: string | null
          uses_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_purchase_amount?: number | null
          updated_at?: string | null
          uses_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      course_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          category: string
          certificate_min_percent: number
          certificates_enabled: boolean
          checkout_url: string | null
          created_at: string | null
          description: string | null
          duration: string
          id: string
          instructor: string
          order_index: number
          refund_enabled: boolean
          refund_window_days: number
          show_card_overlay: boolean | null
          show_category_badge: boolean | null
          thumbnail: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          certificate_min_percent?: number
          certificates_enabled?: boolean
          checkout_url?: string | null
          created_at?: string | null
          description?: string | null
          duration: string
          id?: string
          instructor: string
          order_index?: number
          refund_enabled?: boolean
          refund_window_days?: number
          show_card_overlay?: boolean | null
          show_category_badge?: boolean | null
          thumbnail: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          certificate_min_percent?: number
          certificates_enabled?: boolean
          checkout_url?: string | null
          created_at?: string | null
          description?: string | null
          duration?: string
          id?: string
          instructor?: string
          order_index?: number
          refund_enabled?: boolean
          refund_window_days?: number
          show_card_overlay?: boolean | null
          show_category_badge?: boolean | null
          thumbnail?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          cpf: string | null
          created_at: string | null
          email: string
          id: string
          metadata: Json | null
          name: string | null
          phone: string | null
          source: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string | null
          email: string
          id?: string
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_campaign_sends: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          created_at: string
          error: string | null
          id: string
          opened_at: string | null
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: string
          token: string
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          opened_at?: string | null
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          token?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          opened_at?: string | null
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          backoff_until: string | null
          body_html: string
          created_at: string
          created_by: string | null
          failed_count: number
          filter_config: Json
          id: string
          last_error: string | null
          name: string
          paused_at: string | null
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number
          status: string
          subject: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          backoff_until?: string | null
          body_html?: string
          created_at?: string
          created_by?: string | null
          failed_count?: number
          filter_config?: Json
          id?: string
          last_error?: string | null
          name: string
          paused_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          backoff_until?: string | null
          body_html?: string
          created_at?: string
          created_by?: string | null
          failed_count?: number
          filter_config?: Json
          id?: string
          last_error?: string | null
          name?: string
          paused_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          attempts: number
          created_at: string | null
          email_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          next_attempt_at: string
          provider: string
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          attempts?: number
          created_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          next_attempt_at?: string
          provider: string
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          status: string
          subject: string
        }
        Update: {
          attempts?: number
          created_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          next_attempt_at?: string
          provider?: string
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      email_opt_outs: {
        Row: {
          created_at: string
          email: string
          reason: string | null
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          reason?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          reason?: string | null
          source?: string
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          brevo_api_key: string | null
          created_at: string | null
          from_email: string
          from_name: string
          id: string
          is_active: boolean | null
          provider: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          smtp_user: string | null
          template_colors: Json | null
          updated_at: string | null
          welcome_subject: string | null
          welcome_template: string | null
        }
        Insert: {
          brevo_api_key?: string | null
          created_at?: string | null
          from_email: string
          from_name: string
          id?: string
          is_active?: boolean | null
          provider?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          template_colors?: Json | null
          updated_at?: string | null
          welcome_subject?: string | null
          welcome_template?: string | null
        }
        Update: {
          brevo_api_key?: string | null
          created_at?: string | null
          from_email?: string
          from_name?: string
          id?: string
          is_active?: boolean | null
          provider?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          template_colors?: Json | null
          updated_at?: string | null
          welcome_subject?: string | null
          welcome_template?: string | null
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          created_at: string | null
          ends_at: string | null
          id: string
          product_id: string | null
          source_id: string
          source_type: string
          starts_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          ends_at?: string | null
          id?: string
          product_id?: string | null
          source_id: string
          source_type: string
          starts_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          ends_at?: string | null
          id?: string
          product_id?: string | null
          source_id?: string
          source_type?: string
          starts_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      gateway_credentials: {
        Row: {
          allowed_methods: string[] | null
          created_at: string | null
          env: string
          extra_config: Json | null
          gateway_id: string | null
          id: string
          is_active: boolean | null
          max_installments: number | null
          public_key: string | null
          secret_key: string | null
          updated_at: string | null
          webhook_secret: string | null
        }
        Insert: {
          allowed_methods?: string[] | null
          created_at?: string | null
          env: string
          extra_config?: Json | null
          gateway_id?: string | null
          id?: string
          is_active?: boolean | null
          max_installments?: number | null
          public_key?: string | null
          secret_key?: string | null
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Update: {
          allowed_methods?: string[] | null
          created_at?: string | null
          env?: string
          extra_config?: Json | null
          gateway_id?: string | null
          id?: string
          is_active?: boolean | null
          max_installments?: number | null
          public_key?: string | null
          secret_key?: string | null
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gateway_credentials_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "gateways"
            referencedColumns: ["id"]
          },
        ]
      }
      gateways: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      integration_deliveries: {
        Row: {
          attempt: number
          context: Json
          created_at: string
          delivered_at: string | null
          error: string | null
          event: string
          id: string
          integration_id: string
          max_attempts: number
          next_attempt_at: string
          order_id: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string
        }
        Insert: {
          attempt?: number
          context?: Json
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          event: string
          id?: string
          integration_id: string
          max_attempts?: number
          next_attempt_at?: string
          order_id?: string | null
          payload: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
        }
        Update: {
          attempt?: number
          context?: Json
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          event?: string
          id?: string
          integration_id?: string
          max_attempts?: number
          next_attempt_at?: string
          order_id?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_deliveries_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json
          created_at: string
          has_secret: boolean | null
          id: string
          is_active: boolean
          kind: string
          last_error: string | null
          last_tested_at: string | null
          name: string
          product_ids: string[]
          secret: string | null
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          has_secret?: boolean | null
          id?: string
          is_active?: boolean
          kind: string
          last_error?: string | null
          last_tested_at?: string | null
          name: string
          product_ids?: string[]
          secret?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          has_secret?: boolean | null
          id?: string
          is_active?: boolean
          kind?: string
          last_error?: string | null
          last_tested_at?: string | null
          name?: string
          product_ids?: string[]
          secret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lesson_likes: {
        Row: {
          created_at: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_likes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_materials: {
        Row: {
          content: string
          created_at: string | null
          description: string | null
          file_meta: Json | null
          id: string
          is_required: boolean | null
          lesson_id: string | null
          order_index: number | null
          title: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string | null
          description?: string | null
          file_meta?: Json | null
          id?: string
          is_required?: boolean | null
          lesson_id?: string | null
          order_index?: number | null
          title: string
          type: string
        }
        Update: {
          content?: string
          created_at?: string | null
          description?: string | null
          file_meta?: Json | null
          id?: string
          is_required?: boolean | null
          lesson_id?: string | null
          order_index?: number | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_pdf_annotations: {
        Row: {
          material_id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          material_id: string
          payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          material_id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_pdf_annotations_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "lesson_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean | null
          course_id: string | null
          created_at: string | null
          id: string
          last_watched_at: string | null
          lesson_id: string | null
          progress_percent: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          last_watched_at?: string | null
          lesson_id?: string | null
          progress_percent?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          last_watched_at?: string | null
          lesson_id?: string | null
          progress_percent?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string | null
          description: string | null
          duration: string | null
          id: string
          is_public: boolean | null
          module_id: string | null
          order_index: number
          release_after_days: number | null
          release_at_date: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          is_public?: boolean | null
          module_id?: string | null
          order_index: number
          release_after_days?: number | null
          release_at_date?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          is_public?: boolean | null
          module_id?: string | null
          order_index?: number
          release_after_days?: number | null
          release_at_date?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          key: string
          message: string
          title: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          message: string
          title: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          message?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      modules: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          order_index: number
          release_after_days: number | null
          release_at_date: string | null
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          order_index: number
          release_after_days?: number | null
          release_at_date?: string | null
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          order_index?: number
          release_after_days?: number | null
          release_at_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          id: string
          last_error: string | null
          next_attempt_at: string
          notification_id: string
          phone: string | null
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          attempts?: number
          channel?: string
          created_at?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          notification_id: string
          phone?: string | null
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          notification_id?: string
          phone?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string | null
          read_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          notification_id?: string | null
          read_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          notification_id?: string | null
          read_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience: string
          audience_id: string | null
          created_at: string | null
          created_by: string | null
          event_key: string | null
          expires_at: string | null
          id: string
          link: string | null
          message: string
          publish_at: string
          send_push: boolean
          send_whatsapp: boolean
          title: string
          type: string | null
        }
        Insert: {
          audience?: string
          audience_id?: string | null
          created_at?: string | null
          created_by?: string | null
          event_key?: string | null
          expires_at?: string | null
          id?: string
          link?: string | null
          message: string
          publish_at?: string
          send_push?: boolean
          send_whatsapp?: boolean
          title: string
          type?: string | null
        }
        Update: {
          audience?: string
          audience_id?: string | null
          created_at?: string | null
          created_by?: string | null
          event_key?: string | null
          expires_at?: string | null
          id?: string
          link?: string | null
          message?: string
          publish_at?: string
          send_push?: boolean
          send_whatsapp?: boolean
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      order_bumps: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          discount_percent: number | null
          id: string
          is_active: boolean | null
          offer_product_id: string | null
          priority: number | null
          title: string | null
          trigger_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          offer_product_id?: string | null
          priority?: number | null
          title?: string | null
          trigger_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          offer_product_id?: string | null
          priority?: number | null
          title?: string | null
          trigger_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_bumps_offer_product_id_fkey"
            columns: ["offer_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bumps_trigger_product_id_fkey"
            columns: ["trigger_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          kind: string | null
          order_id: string | null
          price_id: string | null
          product_id: string | null
          quantity: number | null
          total_amount: number
          unit_amount: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          kind?: string | null
          order_id?: string | null
          price_id?: string | null
          product_id?: string | null
          quantity?: number | null
          total_amount: number
          unit_amount: number
        }
        Update: {
          created_at?: string | null
          id?: string
          kind?: string | null
          order_id?: string | null
          price_id?: string | null
          product_id?: string | null
          quantity?: number | null
          total_amount?: number
          unit_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          currency: string | null
          customer_cpf: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          error_message: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          paid_at: string | null
          status: string | null
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          status?: string | null
          total_amount: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          error_message: string | null
          external_payment_id: string | null
          gateway_id: string | null
          id: string
          order_id: string | null
          paid_at: string | null
          payment_method_type: string | null
          raw_response: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          error_message?: string | null
          external_payment_id?: string | null
          gateway_id?: string | null
          id?: string
          order_id?: string | null
          paid_at?: string | null
          payment_method_type?: string | null
          raw_response?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          error_message?: string | null
          external_payment_id?: string | null
          gateway_id?: string | null
          id?: string
          order_id?: string | null
          paid_at?: string | null
          payment_method_type?: string | null
          raw_response?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_field_mappings: {
        Row: {
          created_at: string | null
          field_type: string
          id: string
          json_path: string
          platform_id: string | null
        }
        Insert: {
          created_at?: string | null
          field_type: string
          id?: string
          json_path: string
          platform_id?: string | null
        }
        Update: {
          created_at?: string | null
          field_type?: string
          id?: string
          json_path?: string
          platform_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_field_mappings_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "webhook_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          banner_background_url: string | null
          banner_badge_text: string | null
          banner_button_primary_link: string | null
          banner_button_primary_text: string | null
          banner_button_secondary_link: string | null
          banner_button_secondary_text: string | null
          banner_show_stats_card: boolean | null
          banner_subtitle: string | null
          banner_title_line1: string | null
          banner_title_line2: string | null
          banner_title_line3: string | null
          banner_title_size: string
          certificate_instructor_name: string | null
          certificate_logo_url: string | null
          certificate_signature_url: string | null
          certificate_template: string | null
          certificates_enabled: boolean
          created_at: string | null
          favicon_url: string | null
          gradient_end_color: string | null
          gradient_start_color: string | null
          id: string
          is_active: boolean | null
          login_background_url: string | null
          login_overlay_opacity: number | null
          logo_display_mode: string | null
          logo_horizontal_url: string | null
          logo_image_url: string | null
          logo_text: string | null
          monitoring_internal_logs_active: boolean | null
          monitoring_sentry_active: boolean | null
          monitoring_sentry_dsn: string | null
          navigation_layout: string | null
          page_title: string | null
          sidebar_default_collapsed: boolean | null
          updated_at: string | null
          webhook_secret: string | null
        }
        Insert: {
          banner_background_url?: string | null
          banner_badge_text?: string | null
          banner_button_primary_link?: string | null
          banner_button_primary_text?: string | null
          banner_button_secondary_link?: string | null
          banner_button_secondary_text?: string | null
          banner_show_stats_card?: boolean | null
          banner_subtitle?: string | null
          banner_title_line1?: string | null
          banner_title_line2?: string | null
          banner_title_line3?: string | null
          banner_title_size?: string
          certificate_instructor_name?: string | null
          certificate_logo_url?: string | null
          certificate_signature_url?: string | null
          certificate_template?: string | null
          certificates_enabled?: boolean
          created_at?: string | null
          favicon_url?: string | null
          gradient_end_color?: string | null
          gradient_start_color?: string | null
          id?: string
          is_active?: boolean | null
          login_background_url?: string | null
          login_overlay_opacity?: number | null
          logo_display_mode?: string | null
          logo_horizontal_url?: string | null
          logo_image_url?: string | null
          logo_text?: string | null
          monitoring_internal_logs_active?: boolean | null
          monitoring_sentry_active?: boolean | null
          monitoring_sentry_dsn?: string | null
          navigation_layout?: string | null
          page_title?: string | null
          sidebar_default_collapsed?: boolean | null
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Update: {
          banner_background_url?: string | null
          banner_badge_text?: string | null
          banner_button_primary_link?: string | null
          banner_button_primary_text?: string | null
          banner_button_secondary_link?: string | null
          banner_button_secondary_text?: string | null
          banner_show_stats_card?: boolean | null
          banner_subtitle?: string | null
          banner_title_line1?: string | null
          banner_title_line2?: string | null
          banner_title_line3?: string | null
          banner_title_size?: string
          certificate_instructor_name?: string | null
          certificate_logo_url?: string | null
          certificate_signature_url?: string | null
          certificate_template?: string | null
          certificates_enabled?: boolean
          created_at?: string | null
          favicon_url?: string | null
          gradient_end_color?: string | null
          gradient_start_color?: string | null
          id?: string
          is_active?: boolean | null
          login_background_url?: string | null
          login_overlay_opacity?: number | null
          logo_display_mode?: string | null
          logo_horizontal_url?: string | null
          logo_image_url?: string | null
          logo_text?: string | null
          monitoring_internal_logs_active?: boolean | null
          monitoring_sentry_active?: boolean | null
          monitoring_sentry_dsn?: string | null
          navigation_layout?: string | null
          page_title?: string | null
          sidebar_default_collapsed?: boolean | null
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Relationships: []
      }
      platform_status_mappings: {
        Row: {
          created_at: string | null
          external_value: string
          id: string
          internal_status: string
          platform_id: string | null
        }
        Insert: {
          created_at?: string | null
          external_value: string
          id?: string
          internal_status: string
          platform_id?: string | null
        }
        Update: {
          created_at?: string | null
          external_value?: string
          id?: string
          internal_status?: string
          platform_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_status_mappings_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "webhook_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      prices: {
        Row: {
          active: boolean | null
          created_at: string | null
          currency: string | null
          id: string
          interval: string | null
          interval_count: number | null
          nickname: string | null
          product_id: string | null
          trial_period_days: number | null
          type: string
          unit_amount: number
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          currency?: string | null
          id?: string
          interval?: string | null
          interval_count?: number | null
          nickname?: string | null
          product_id?: string | null
          trial_period_days?: number | null
          type: string
          unit_amount: number
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          currency?: string | null
          id?: string
          interval?: string | null
          interval_count?: number | null
          nickname?: string | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: string
          unit_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_mappings: {
        Row: {
          category: string | null
          course_id: string | null
          created_at: string | null
          external_product_id: string
          external_product_name: string | null
          grant_type: string | null
          id: string
          is_active: boolean | null
          platform_id: string | null
        }
        Insert: {
          category?: string | null
          course_id?: string | null
          created_at?: string | null
          external_product_id: string
          external_product_name?: string | null
          grant_type?: string | null
          id?: string
          is_active?: boolean | null
          platform_id?: string | null
        }
        Update: {
          category?: string | null
          course_id?: string | null
          created_at?: string | null
          external_product_id?: string
          external_product_name?: string | null
          grant_type?: string | null
          id?: string
          is_active?: boolean | null
          platform_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_mappings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_mappings_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "webhook_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          category: string | null
          checkout_config: Json | null
          checkout_slug: string | null
          course_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          metadata: Json | null
          name: string
          price: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          checkout_config?: Json | null
          checkout_slug?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          name: string
          price?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          checkout_config?: Json | null
          checkout_slug?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          name?: string
          price?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          member_since: string | null
          name: string
          status: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          member_since?: string | null
          name: string
          status?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          member_since?: string | null
          name?: string
          status?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          failure_count: number
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          failure_count?: number
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          failure_count?: number
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          count: number | null
          created_at: string | null
          id: string
          identifier: string
          window_start: string | null
        }
        Insert: {
          action: string
          count?: number | null
          created_at?: string | null
          id?: string
          identifier: string
          window_start?: string | null
        }
        Update: {
          action?: string
          count?: number | null
          created_at?: string | null
          id?: string
          identifier?: string
          window_start?: string | null
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          admin_notes: string | null
          completed_at: string | null
          created_at: string
          gateway: string | null
          gateway_refund_id: string | null
          gateway_response: Json | null
          id: string
          last_error: string | null
          manual_refund_required: boolean
          order_id: string
          product_id: string | null
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string
          gateway?: string | null
          gateway_refund_id?: string | null
          gateway_response?: Json | null
          id?: string
          last_error?: string | null
          manual_refund_required?: boolean
          order_id: string
          product_id?: string | null
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string
          gateway?: string | null
          gateway_refund_id?: string | null
          gateway_response?: Json | null
          id?: string
          last_error?: string | null
          manual_refund_required?: boolean
          order_id?: string
          product_id?: string | null
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          ended_at: string | null
          external_subscription_id: string | null
          gateway_id: string | null
          id: string
          metadata: Json | null
          price_id: string | null
          product_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          external_subscription_id?: string | null
          gateway_id?: string | null
          id?: string
          metadata?: Json | null
          price_id?: string | null
          product_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          external_subscription_id?: string | null
          gateway_id?: string | null
          id?: string
          metadata?: Json | null
          price_id?: string | null
          product_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_settings: {
        Row: {
          color_palette: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          primary_color: string
          updated_at: string | null
        }
        Insert: {
          color_palette: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          primary_color: string
          updated_at?: string | null
        }
        Update: {
          color_palette?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          primary_color?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string | null
          id: string
          unlocked_at: string | null
          user_id: string | null
        }
        Insert: {
          achievement_id?: string | null
          id?: string
          unlocked_at?: string | null
          user_id?: string | null
        }
        Update: {
          achievement_id?: string | null
          id?: string
          unlocked_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_course_access: {
        Row: {
          course_id: string | null
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          source: string | null
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          source?: string | null
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_course_access_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_course_categories: {
        Row: {
          category: string
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          course_id: string | null
          created_at: string | null
          id: string
          last_watched_at: string | null
          lesson_id: string | null
          notes: string | null
          progress_percent: number
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          last_watched_at?: string | null
          lesson_id?: string | null
          notes?: string | null
          progress_percent?: number
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          last_watched_at?: string | null
          lesson_id?: string | null
          notes?: string | null
          progress_percent?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          best_streak: number | null
          created_at: string | null
          current_streak: number | null
          id: string
          last_activity_date: string | null
          lessons_today: number | null
          level: number | null
          total_xp: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          best_streak?: number | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          lessons_today?: number | null
          level?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          best_streak?: number | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          lessons_today?: number | null
          level?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt: number
          created_at: string
          delivered_at: string | null
          endpoint_id: string
          error: string | null
          event: string
          id: string
          max_attempts: number
          next_attempt_at: string
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          delivered_at?: string | null
          endpoint_id: string
          error?: string | null
          event: string
          id?: string
          max_attempts?: number
          next_attempt_at?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
        }
        Update: {
          attempt?: number
          created_at?: string
          delivered_at?: string | null
          endpoint_id?: string
          error?: string | null
          event?: string
          id?: string
          max_attempts?: number
          next_attempt_at?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          name: string
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          name: string
          secret: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          name?: string
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      webhook_event_receivers: {
        Row: {
          created_at: string | null
          event_type: string
          field_mappings: Json | null
          fixed_course_id: string | null
          id: string
          is_active: boolean | null
          last_received_at: string | null
          name: string | null
          platform_id: string | null
          request_count: number
          sample_payload: Json | null
          signing_secret: string | null
          updated_at: string | null
          use_global_mappings: boolean | null
          webhook_token: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          field_mappings?: Json | null
          fixed_course_id?: string | null
          id?: string
          is_active?: boolean | null
          last_received_at?: string | null
          name?: string | null
          platform_id?: string | null
          request_count?: number
          sample_payload?: Json | null
          signing_secret?: string | null
          updated_at?: string | null
          use_global_mappings?: boolean | null
          webhook_token?: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          field_mappings?: Json | null
          fixed_course_id?: string | null
          id?: string
          is_active?: boolean | null
          last_received_at?: string | null
          name?: string | null
          platform_id?: string | null
          request_count?: number
          sample_payload?: Json | null
          signing_secret?: string | null
          updated_at?: string | null
          use_global_mappings?: boolean | null
          webhook_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_event_receivers_fixed_course_id_fkey"
            columns: ["fixed_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_event_receivers_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "webhook_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string | null
          event_type: string
          external_event_id: string | null
          gateway_id: string | null
          id: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          external_event_id?: string | null
          gateway_id?: string | null
          id?: string
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          external_event_id?: string | null
          gateway_id?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "gateways"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_field_mappings: {
        Row: {
          created_at: string | null
          event_type: string | null
          id: string
          internal_field: string
          is_primary: boolean | null
          platform_id: string | null
          source_path: string
          transform_config: Json | null
          transform_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          internal_field: string
          is_primary?: boolean | null
          platform_id?: string | null
          source_path: string
          transform_config?: Json | null
          transform_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          internal_field?: string
          is_primary?: boolean | null
          platform_id?: string | null
          source_path?: string
          transform_config?: Json | null
          transform_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_field_mappings_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "webhook_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_platforms: {
        Row: {
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          name: string
          settings: Json | null
          updated_at: string | null
          webhook_secret: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          name: string
          settings?: Json | null
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          settings?: Json | null
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Relationships: []
      }
      webhook_receiver_events: {
        Row: {
          actor_email: string | null
          created_at: string
          external_transaction_id: string | null
          id: string
          outcome: string
          reason: string | null
          receiver_id: string
        }
        Insert: {
          actor_email?: string | null
          created_at?: string
          external_transaction_id?: string | null
          id?: string
          outcome: string
          reason?: string | null
          receiver_id: string
        }
        Update: {
          actor_email?: string | null
          created_at?: string
          external_transaction_id?: string | null
          id?: string
          outcome?: string
          reason?: string | null
          receiver_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_receiver_events_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "webhook_event_receivers"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_samples: {
        Row: {
          created_at: string | null
          id: string
          learned_at: string | null
          platform_id: string | null
          raw_payload: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          learned_at?: string | null
          platform_id?: string | null
          raw_payload: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          learned_at?: string | null
          platform_id?: string | null
          raw_payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "webhook_samples_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "webhook_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_schemas: {
        Row: {
          created_at: string | null
          event_type: string
          fields_json: Json | null
          id: string
          is_learned: boolean | null
          platform_id: string | null
          sample_event_id: string | null
          sample_payload: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          fields_json?: Json | null
          id?: string
          is_learned?: boolean | null
          platform_id?: string | null
          sample_event_id?: string | null
          sample_payload?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          fields_json?: Json | null
          id?: string
          is_learned?: boolean | null
          platform_id?: string | null
          sample_event_id?: string | null
          sample_payload?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_schemas_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "webhook_platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_schemas_sample_event_id_fkey"
            columns: ["sample_event_id"]
            isOneToOne: false
            referencedRelation: "view_data_health_audit"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "webhook_schemas_sample_event_id_fkey"
            columns: ["sample_event_id"]
            isOneToOne: false
            referencedRelation: "webhook_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_transactions: {
        Row: {
          course_id: string | null
          created_at: string | null
          customer_email: string
          customer_name: string | null
          error_message: string | null
          event_type: string
          external_product_id: string | null
          external_transaction_id: string
          id: string
          max_retries: number | null
          next_retry_at: string | null
          platform_id: string | null
          processed_at: string | null
          processing_result: Json | null
          raw_payload: Json
          retry_count: number | null
          status: string
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          customer_email: string
          customer_name?: string | null
          error_message?: string | null
          event_type: string
          external_product_id?: string | null
          external_transaction_id: string
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          platform_id?: string | null
          processed_at?: string | null
          processing_result?: Json | null
          raw_payload: Json
          retry_count?: number | null
          status: string
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string | null
          error_message?: string | null
          event_type?: string
          external_product_id?: string | null
          external_transaction_id?: string
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          platform_id?: string | null
          processed_at?: string | null
          processing_result?: Json | null
          raw_payload?: Json
          retry_count?: number | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_transactions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_transactions_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "webhook_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          message_preview: string | null
          metadata: Json | null
          phone: string
          provider: string
          status: string
          template_key: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_preview?: string | null
          metadata?: Json | null
          phone: string
          provider: string
          status: string
          template_key?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_preview?: string | null
          metadata?: Json | null
          phone?: string
          provider?: string
          status?: string
          template_key?: string | null
        }
        Relationships: []
      }
      whatsapp_settings: {
        Row: {
          created_at: string | null
          default_country_code: string | null
          delay_between_messages: number | null
          evolution_api_key: string | null
          evolution_api_url: string | null
          evolution_instance_name: string | null
          id: string
          is_active: boolean | null
          meta_access_token: string | null
          meta_business_account_id: string | null
          meta_phone_number_id: string | null
          provider: string
          send_typing_indicator: boolean | null
          updated_at: string | null
          waha_api_url: string | null
          waha_session_name: string | null
          zapi_instance_id: string | null
          zapi_security_token: string | null
          zapi_token: string | null
        }
        Insert: {
          created_at?: string | null
          default_country_code?: string | null
          delay_between_messages?: number | null
          evolution_api_key?: string | null
          evolution_api_url?: string | null
          evolution_instance_name?: string | null
          id?: string
          is_active?: boolean | null
          meta_access_token?: string | null
          meta_business_account_id?: string | null
          meta_phone_number_id?: string | null
          provider?: string
          send_typing_indicator?: boolean | null
          updated_at?: string | null
          waha_api_url?: string | null
          waha_session_name?: string | null
          zapi_instance_id?: string | null
          zapi_security_token?: string | null
          zapi_token?: string | null
        }
        Update: {
          created_at?: string | null
          default_country_code?: string | null
          delay_between_messages?: number | null
          evolution_api_key?: string | null
          evolution_api_url?: string | null
          evolution_instance_name?: string | null
          id?: string
          is_active?: boolean | null
          meta_access_token?: string | null
          meta_business_account_id?: string | null
          meta_phone_number_id?: string | null
          provider?: string
          send_typing_indicator?: boolean | null
          updated_at?: string | null
          waha_api_url?: string | null
          waha_session_name?: string | null
          zapi_instance_id?: string | null
          zapi_security_token?: string | null
          zapi_token?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      platform_settings_public: {
        Row: {
          banner_background_url: string | null
          banner_badge_text: string | null
          banner_button_primary_link: string | null
          banner_button_primary_text: string | null
          banner_button_secondary_link: string | null
          banner_button_secondary_text: string | null
          banner_show_stats_card: boolean | null
          banner_subtitle: string | null
          banner_title_line1: string | null
          banner_title_line2: string | null
          banner_title_line3: string | null
          banner_title_size: string | null
          certificate_instructor_name: string | null
          certificate_logo_url: string | null
          certificate_signature_url: string | null
          certificate_template: string | null
          certificates_enabled: boolean | null
          created_at: string | null
          favicon_url: string | null
          gradient_end_color: string | null
          gradient_start_color: string | null
          id: string | null
          is_active: boolean | null
          login_background_url: string | null
          login_overlay_opacity: number | null
          logo_display_mode: string | null
          logo_horizontal_url: string | null
          logo_image_url: string | null
          logo_text: string | null
          monitoring_internal_logs_active: boolean | null
          monitoring_sentry_active: boolean | null
          monitoring_sentry_dsn: string | null
          navigation_layout: string | null
          page_title: string | null
          sidebar_default_collapsed: boolean | null
          updated_at: string | null
        }
        Insert: {
          banner_background_url?: string | null
          banner_badge_text?: string | null
          banner_button_primary_link?: string | null
          banner_button_primary_text?: string | null
          banner_button_secondary_link?: string | null
          banner_button_secondary_text?: string | null
          banner_show_stats_card?: boolean | null
          banner_subtitle?: string | null
          banner_title_line1?: string | null
          banner_title_line2?: string | null
          banner_title_line3?: string | null
          banner_title_size?: string | null
          certificate_instructor_name?: string | null
          certificate_logo_url?: string | null
          certificate_signature_url?: string | null
          certificate_template?: string | null
          certificates_enabled?: boolean | null
          created_at?: string | null
          favicon_url?: string | null
          gradient_end_color?: string | null
          gradient_start_color?: string | null
          id?: string | null
          is_active?: boolean | null
          login_background_url?: string | null
          login_overlay_opacity?: number | null
          logo_display_mode?: string | null
          logo_horizontal_url?: string | null
          logo_image_url?: string | null
          logo_text?: string | null
          monitoring_internal_logs_active?: boolean | null
          monitoring_sentry_active?: boolean | null
          monitoring_sentry_dsn?: string | null
          navigation_layout?: string | null
          page_title?: string | null
          sidebar_default_collapsed?: boolean | null
          updated_at?: string | null
        }
        Update: {
          banner_background_url?: string | null
          banner_badge_text?: string | null
          banner_button_primary_link?: string | null
          banner_button_primary_text?: string | null
          banner_button_secondary_link?: string | null
          banner_button_secondary_text?: string | null
          banner_show_stats_card?: boolean | null
          banner_subtitle?: string | null
          banner_title_line1?: string | null
          banner_title_line2?: string | null
          banner_title_line3?: string | null
          banner_title_size?: string | null
          certificate_instructor_name?: string | null
          certificate_logo_url?: string | null
          certificate_signature_url?: string | null
          certificate_template?: string | null
          certificates_enabled?: boolean | null
          created_at?: string | null
          favicon_url?: string | null
          gradient_end_color?: string | null
          gradient_start_color?: string | null
          id?: string | null
          is_active?: boolean | null
          login_background_url?: string | null
          login_overlay_opacity?: number | null
          logo_display_mode?: string | null
          logo_horizontal_url?: string | null
          logo_image_url?: string | null
          logo_text?: string | null
          monitoring_internal_logs_active?: boolean | null
          monitoring_sentry_active?: boolean | null
          monitoring_sentry_dsn?: string | null
          navigation_layout?: string | null
          page_title?: string | null
          sidebar_default_collapsed?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          id: string | null
          is_admin: boolean | null
          name: string | null
        }
        Insert: {
          avatar_url?: string | null
          id?: string | null
          is_admin?: never
          name?: string | null
        }
        Update: {
          avatar_url?: string | null
          id?: string | null
          is_admin?: never
          name?: string | null
        }
        Relationships: []
      }
      view_data_health_audit: {
        Row: {
          course_id: string | null
          course_name: string | null
          customer_email: string | null
          customer_name: string | null
          event_type: string | null
          health_status: string | null
          platform_id: string | null
          platform_name: string | null
          processed_at: string | null
          transaction_id: string | null
          transaction_status: string | null
          user_id: string | null
          whatsapp: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_transactions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_transactions_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "webhook_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      build_order_webhook_payload: {
        Args: { p_order_id: string; p_status: string }
        Returns: Json
      }
      bump_campaign_counts: {
        Args: { p_campaign_id: string; p_failed: number; p_sent: number }
        Returns: undefined
      }
      bump_webhook_receiver_count: {
        Args: { p_receiver_id: string }
        Returns: undefined
      }
      campaign_recipient_count: { Args: { p_filter?: Json }; Returns: number }
      campaign_recipients: {
        Args: { p_filter?: Json; p_limit?: number }
        Returns: {
          email: string
          name: string
          user_id: string
        }[]
      }
      capture_cart_lead: {
        Args: {
          p_cpf?: string
          p_email: string
          p_metadata?: Json
          p_name?: string
          p_phone?: string
          p_product_id: string
        }
        Returns: string
      }
      course_completion_percent: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: number
      }
      enqueue_cart_abandoned_webhook: {
        Args: { p_lead_id: string }
        Returns: undefined
      }
      enqueue_test_webhook: { Args: { p_endpoint_id: string }; Returns: string }
      get_checkout_gateways: {
        Args: never
        Returns: {
          allowed_methods: string[]
          is_default: boolean
          name: string
          slug: string
        }[]
      }
      get_gateway_public_key: {
        Args: { slug_input: string }
        Returns: {
          allowed_methods: string[]
          gateway_id: string
          public_key: string
        }[]
      }
      get_leaderboard_v2: {
        Args: { period_type?: string }
        Returns: {
          avatar_url: string
          current_streak: number
          level: number
          total_xp: number
          user_id: string
          user_name: string
        }[]
      }
      get_order_pix: { Args: { p_order_id: string }; Returns: Json }
      get_order_public: { Args: { p_order_id: string }; Returns: Json }
      claim_order_upsell: { Args: { p_order_id: string }; Returns: boolean }
      get_public_integrations: {
        Args: { p_product_id?: string }
        Returns: {
          config: Json
          kind: string
        }[]
      }
      grant_order_access_for_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      product_slugify: { Args: { input: string }; Returns: string }
      refund_eligibility: { Args: { p_course_id: string }; Returns: Json }
      request_refund: {
        Args: { p_course_id: string; p_reason: string }
        Returns: string
      }
      requeue_integration_delivery: {
        Args: { p_delivery_id: string }
        Returns: boolean
      }
      requeue_webhook_delivery: {
        Args: { p_delivery_id: string }
        Returns: boolean
      }
      save_active_theme: {
        Args: { p_color_palette: Json; p_primary_color: string }
        Returns: {
          color_palette: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          primary_color: string
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "theme_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      toggle_lesson_like: { Args: { p_lesson_id: string }; Returns: Json }
      trigger_campaign_dispatch: { Args: never; Returns: undefined }
      trigger_cart_recovery: { Args: never; Returns: undefined }
      trigger_integration_dispatch: { Args: never; Returns: undefined }
      trigger_notification_dispatch: { Args: never; Returns: undefined }
      trigger_webhook_dispatch: { Args: never; Returns: undefined }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
