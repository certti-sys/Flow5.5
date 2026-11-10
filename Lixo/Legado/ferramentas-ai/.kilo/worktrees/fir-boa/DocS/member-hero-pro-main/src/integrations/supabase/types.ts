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
      admin_notifications_settings: {
        Row: {
          alert_email: string | null
          alert_on_error: boolean | null
          alert_on_new_student: boolean | null
          alert_on_success: boolean | null
          created_at: string
          daily_digest: boolean | null
          email_alerts: boolean | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_email?: string | null
          alert_on_error?: boolean | null
          alert_on_new_student?: boolean | null
          alert_on_success?: boolean | null
          created_at?: string
          daily_digest?: boolean | null
          email_alerts?: boolean | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_email?: string | null
          alert_on_error?: boolean | null
          alert_on_new_student?: boolean | null
          alert_on_success?: boolean | null
          created_at?: string
          daily_digest?: boolean | null
          email_alerts?: boolean | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      banner_principal: {
        Row: {
          altura_original: number | null
          aspect_ratio: string | null
          created_at: string
          exibir: boolean | null
          id: string
          imagem_url: string | null
          largura_original: number | null
          object_fit: string | null
          updated_at: string
        }
        Insert: {
          altura_original?: number | null
          aspect_ratio?: string | null
          created_at?: string
          exibir?: boolean | null
          id?: string
          imagem_url?: string | null
          largura_original?: number | null
          object_fit?: string | null
          updated_at?: string
        }
        Update: {
          altura_original?: number | null
          aspect_ratio?: string | null
          created_at?: string
          exibir?: boolean | null
          id?: string
          imagem_url?: string | null
          largura_original?: number | null
          object_fit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      banners_secundarios: {
        Row: {
          agendamento_data_fim: string | null
          agendamento_data_inicio: string | null
          agendamento_habilitado: boolean | null
          agendamento_hora_fim: string | null
          agendamento_hora_inicio: string | null
          ativo: boolean | null
          created_at: string
          id: string
          imagem_url: string | null
          nome: string | null
          ordem: number | null
          posicao: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          agendamento_data_fim?: string | null
          agendamento_data_inicio?: string | null
          agendamento_habilitado?: boolean | null
          agendamento_hora_fim?: string | null
          agendamento_hora_inicio?: string | null
          ativo?: boolean | null
          created_at?: string
          id?: string
          imagem_url?: string | null
          nome?: string | null
          ordem?: number | null
          posicao: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          agendamento_data_fim?: string | null
          agendamento_data_inicio?: string | null
          agendamento_habilitado?: boolean | null
          agendamento_hora_fim?: string | null
          agendamento_hora_inicio?: string | null
          ativo?: boolean | null
          created_at?: string
          id?: string
          imagem_url?: string | null
          nome?: string | null
          ordem?: number | null
          posicao?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cards_settings: {
        Row: {
          created_at: string
          id: string
          image_aspect_ratio: string | null
          layout: string | null
          show_category: boolean | null
          show_duration: boolean | null
          show_progress: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_aspect_ratio?: string | null
          layout?: string | null
          show_category?: boolean | null
          show_duration?: boolean | null
          show_progress?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_aspect_ratio?: string | null
          layout?: string | null
          show_category?: boolean | null
          show_duration?: boolean | null
          show_progress?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: []
      }
      communities: {
        Row: {
          ativo: boolean | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_access: {
        Row: {
          created_at: string
          granted_at: string | null
          has_access: boolean | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string | null
          has_access?: boolean | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string | null
          has_access?: boolean | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          created_at: string
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      community_settings: {
        Row: {
          banner_principal: string | null
          cor_destaque: string | null
          created_at: string
          cursos_vinculados: string[] | null
          descricao: string | null
          icone: string | null
          id: string
          imagem_capa: string | null
          mensagem_boas_vindas: string | null
          modulos_vinculados: string[] | null
          nome: string
          updated_at: string
        }
        Insert: {
          banner_principal?: string | null
          cor_destaque?: string | null
          created_at?: string
          cursos_vinculados?: string[] | null
          descricao?: string | null
          icone?: string | null
          id?: string
          imagem_capa?: string | null
          mensagem_boas_vindas?: string | null
          modulos_vinculados?: string[] | null
          nome?: string
          updated_at?: string
        }
        Update: {
          banner_principal?: string | null
          cor_destaque?: string | null
          created_at?: string
          cursos_vinculados?: string[] | null
          descricao?: string | null
          icone?: string | null
          id?: string
          imagem_capa?: string | null
          mensagem_boas_vindas?: string | null
          modulos_vinculados?: string[] | null
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_access: {
        Row: {
          course_id: string
          created_at: string
          expires_at: string | null
          granted: boolean | null
          granted_at: string | null
          id: string
          source: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          expires_at?: string | null
          granted?: boolean | null
          granted_at?: string | null
          id?: string
          source?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          expires_at?: string | null
          granted?: boolean | null
          granted_at?: string | null
          id?: string
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      course_tags: {
        Row: {
          course_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          banner: string | null
          categoria_id: string | null
          checkout_url: string | null
          created_at: string
          descricao: string | null
          external_product_id: string | null
          external_product_name: string | null
          id: string
          imagem: string | null
          integration_enabled: boolean | null
          integration_notes: string | null
          integration_platform: string | null
          status: string | null
          tag_integracao: string | null
          tipo: string | null
          titulo: string
        }
        Insert: {
          banner?: string | null
          categoria_id?: string | null
          checkout_url?: string | null
          created_at?: string
          descricao?: string | null
          external_product_id?: string | null
          external_product_name?: string | null
          id?: string
          imagem?: string | null
          integration_enabled?: boolean | null
          integration_notes?: string | null
          integration_platform?: string | null
          status?: string | null
          tag_integracao?: string | null
          tipo?: string | null
          titulo: string
        }
        Update: {
          banner?: string | null
          categoria_id?: string | null
          checkout_url?: string | null
          created_at?: string
          descricao?: string | null
          external_product_id?: string | null
          external_product_name?: string | null
          id?: string
          imagem?: string | null
          integration_enabled?: boolean | null
          integration_notes?: string | null
          integration_platform?: string | null
          status?: string | null
          tag_integracao?: string | null
          tipo?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_courses_categories"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          lesson_id: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lesson_id: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lesson_id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          last_position: number | null
          lesson_id: string
          module_id: string | null
          progress_percent: number | null
          updated_at: string
          user_id: string
          watched_seconds: number | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          last_position?: number | null
          lesson_id: string
          module_id?: string | null
          progress_percent?: number | null
          updated_at?: string
          user_id: string
          watched_seconds?: number | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          last_position?: number | null
          lesson_id?: string
          module_id?: string | null
          progress_percent?: number | null
          updated_at?: string
          user_id?: string
          watched_seconds?: number | null
        }
        Relationships: []
      }
      lessons: {
        Row: {
          arquivo: string | null
          created_at: string
          curso_id: string
          descricao: string | null
          id: string
          materiais_extras: Json | null
          modulo_id: string
          nome: string
          ordem: number | null
          status: string | null
          thumbnail: string | null
          tipo: string | null
          url: string | null
        }
        Insert: {
          arquivo?: string | null
          created_at?: string
          curso_id: string
          descricao?: string | null
          id?: string
          materiais_extras?: Json | null
          modulo_id: string
          nome: string
          ordem?: number | null
          status?: string | null
          thumbnail?: string | null
          tipo?: string | null
          url?: string | null
        }
        Update: {
          arquivo?: string | null
          created_at?: string
          curso_id?: string
          descricao?: string | null
          id?: string
          materiais_extras?: Json | null
          modulo_id?: string
          nome?: string
          ordem?: number | null
          status?: string | null
          thumbnail?: string | null
          tipo?: string | null
          url?: string | null
        }
        Relationships: []
      }
      modules: {
        Row: {
          created_at: string
          curso_id: string
          descricao: string | null
          id: string
          imagem: string | null
          nome: string
          ordem: number | null
          status: string | null
        }
        Insert: {
          created_at?: string
          curso_id: string
          descricao?: string | null
          id?: string
          imagem?: string | null
          nome: string
          ordem?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string
          curso_id?: string
          descricao?: string | null
          id?: string
          imagem?: string | null
          nome?: string
          ordem?: number | null
          status?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          aula_id: string | null
          created_at: string
          curso_id: string | null
          id: string
          lida: boolean | null
          mensagem: string
          modulo_id: string | null
          tipo: string
          titulo: string
          user_id: string | null
        }
        Insert: {
          aula_id?: string | null
          created_at?: string
          curso_id?: string | null
          id?: string
          lida?: boolean | null
          mensagem: string
          modulo_id?: string | null
          tipo: string
          titulo: string
          user_id?: string | null
        }
        Update: {
          aula_id?: string | null
          created_at?: string
          curso_id?: string | null
          id?: string
          lida?: boolean | null
          mensagem?: string
          modulo_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          allow_registration: boolean | null
          background_color: string | null
          created_at: string
          facebook_pixel_id: string | null
          favicon: string | null
          footer_text: string | null
          google_analytics_id: string | null
          id: string
          logo: string | null
          maintenance_mode: boolean | null
          platform_name: string | null
          primary_color: string | null
          support_email: string | null
          surface_color: string | null
          text_color: string | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          allow_registration?: boolean | null
          background_color?: string | null
          created_at?: string
          facebook_pixel_id?: string | null
          favicon?: string | null
          footer_text?: string | null
          google_analytics_id?: string | null
          id?: string
          logo?: string | null
          maintenance_mode?: boolean | null
          platform_name?: string | null
          primary_color?: string | null
          support_email?: string | null
          surface_color?: string | null
          text_color?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          allow_registration?: boolean | null
          background_color?: string | null
          created_at?: string
          facebook_pixel_id?: string | null
          favicon?: string | null
          footer_text?: string | null
          google_analytics_id?: string | null
          id?: string
          logo?: string | null
          maintenance_mode?: boolean | null
          platform_name?: string | null
          primary_color?: string | null
          support_email?: string | null
          surface_color?: string | null
          text_color?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          last_access_at: string | null
          name: string | null
          onboarding_email_sent_at: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_access_at?: string | null
          name?: string | null
          onboarding_email_sent_at?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_access_at?: string | null
          name?: string | null
          onboarding_email_sent_at?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_banners: {
        Row: {
          agendamento_data_fim: string | null
          agendamento_data_inicio: string | null
          agendamento_habilitado: boolean | null
          agendamento_hora_fim: string | null
          agendamento_hora_inicio: string | null
          ativo: boolean | null
          created_at: string
          exibir_comunidade: boolean | null
          exibir_vitrine: boolean | null
          id: string
          imagem_url: string | null
          nome: string | null
          ordem: number | null
          posicao: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          agendamento_data_fim?: string | null
          agendamento_data_inicio?: string | null
          agendamento_habilitado?: boolean | null
          agendamento_hora_fim?: string | null
          agendamento_hora_inicio?: string | null
          ativo?: boolean | null
          created_at?: string
          exibir_comunidade?: boolean | null
          exibir_vitrine?: boolean | null
          id?: string
          imagem_url?: string | null
          nome?: string | null
          ordem?: number | null
          posicao?: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          agendamento_data_fim?: string | null
          agendamento_data_inicio?: string | null
          agendamento_habilitado?: boolean | null
          agendamento_hora_fim?: string | null
          agendamento_hora_inicio?: string | null
          ativo?: boolean | null
          created_at?: string
          exibir_comunidade?: boolean | null
          exibir_vitrine?: boolean | null
          id?: string
          imagem_url?: string | null
          nome?: string | null
          ordem?: number | null
          posicao?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shelf_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          ordem: number | null
          shelf_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          ordem?: number | null
          shelf_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          ordem?: number | null
          shelf_id?: string
        }
        Relationships: []
      }
      shelves: {
        Row: {
          ativo: boolean | null
          categoria_id: string | null
          created_at: string
          id: string
          ordem: number | null
          tipo: string | null
          titulo: string
        }
        Insert: {
          ativo?: boolean | null
          categoria_id?: string | null
          created_at?: string
          id?: string
          ordem?: number | null
          tipo?: string | null
          titulo: string
        }
        Update: {
          ativo?: boolean | null
          categoria_id?: string | null
          created_at?: string
          id?: string
          ordem?: number | null
          tipo?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "shelves_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      showcase_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          aula_id: string
          completed: boolean | null
          completed_at: string | null
          created_at: string
          curso_id: string
          id: string
          last_position: number | null
          progress_percent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aula_id: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          curso_id: string
          id?: string
          last_position?: number | null
          progress_percent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aula_id?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          curso_id?: string
          id?: string
          last_position?: number | null
          progress_percent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      webhook_configs: {
        Row: {
          active: boolean | null
          checkout_url: string | null
          course_id: string
          created_at: string
          external_product_id: string | null
          id: string
          platform: string
          secret_key: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          checkout_url?: string | null
          course_id: string
          created_at?: string
          external_product_id?: string | null
          id?: string
          platform: string
          secret_key?: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          checkout_url?: string | null
          course_id?: string
          created_at?: string
          external_product_id?: string | null
          id?: string
          platform?: string
          secret_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          buyer_email: string | null
          buyer_name: string | null
          course_matched: boolean | null
          created_at: string
          curso_id: string | null
          evento: string
          external_product_id: string | null
          id: string
          mensagem: string | null
          payload: Json | null
          plataforma: string
          status: string
          transaction_id: string | null
          webhook_id: string | null
        }
        Insert: {
          buyer_email?: string | null
          buyer_name?: string | null
          course_matched?: boolean | null
          created_at?: string
          curso_id?: string | null
          evento: string
          external_product_id?: string | null
          id?: string
          mensagem?: string | null
          payload?: Json | null
          plataforma: string
          status: string
          transaction_id?: string | null
          webhook_id?: string | null
        }
        Update: {
          buyer_email?: string | null
          buyer_name?: string | null
          course_matched?: boolean | null
          created_at?: string
          curso_id?: string | null
          evento?: string
          external_product_id?: string | null
          id?: string
          mensagem?: string | null
          payload?: Json | null
          plataforma?: string
          status?: string
          transaction_id?: string | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          ativo: boolean | null
          checkout_url: string | null
          created_at: string
          curso_id: string
          external_product_id: string | null
          id: string
          plataforma: string
          secret_key: string
        }
        Insert: {
          ativo?: boolean | null
          checkout_url?: string | null
          created_at?: string
          curso_id: string
          external_product_id?: string | null
          id?: string
          plataforma: string
          secret_key: string
        }
        Update: {
          ativo?: boolean | null
          checkout_url?: string | null
          created_at?: string
          curso_id?: string
          external_product_id?: string | null
          id?: string
          plataforma?: string
          secret_key?: string
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
    }
    Enums: {
      app_role: "admin" | "student"
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
      app_role: ["admin", "student"],
    },
  },
} as const
