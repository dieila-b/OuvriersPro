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
      account_reports: {
        Row: {
          admin_note: string | null
          created_at: string
          details: string | null
          evidence_url: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_role: string | null
          reported_user_id: string
          reporter_user_id: string
          status: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          details?: string | null
          evidence_url?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_role?: string | null
          reported_user_id: string
          reporter_user_id: string
          status?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          details?: string | null
          evidence_url?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_role?: string | null
          reported_user_id?: string
          reporter_user_id?: string
          status?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ads_advertisers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          type: string
          website: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          type: string
          website?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          type?: string
          website?: string | null
        }
        Relationships: []
      }
      ads_assets: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          media_type: Database["public"]["Enums"]["ad_media_type"]
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          media_type: Database["public"]["Enums"]["ad_media_type"]
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          media_type?: Database["public"]["Enums"]["ad_media_type"]
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ads_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_campaigns: {
        Row: {
          created_at: string
          display_seconds: number
          end_at: string | null
          id: string
          link_url: string | null
          placement: string
          priority: number
          start_at: string | null
          status: Database["public"]["Enums"]["ad_campaign_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_seconds?: number
          end_at?: string | null
          id?: string
          link_url?: string | null
          placement?: string
          priority?: number
          start_at?: string | null
          status?: Database["public"]["Enums"]["ad_campaign_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_seconds?: number
          end_at?: string | null
          id?: string
          link_url?: string | null
          placement?: string
          priority?: number
          start_at?: string | null
          status?: Database["public"]["Enums"]["ad_campaign_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ads_stats: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          event: string
          id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          event: string
          id?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          event?: string
          id?: string
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer_en: string | null
          answer_en_norm: string | null
          answer_fr: string | null
          answer_fr_norm: string | null
          category: string
          created_at: string
          id: string
          is_published: boolean
          question_en: string | null
          question_en_norm: string | null
          question_fr: string | null
          question_fr_norm: string | null
          search_vector: unknown
          updated_at: string
        }
        Insert: {
          answer_en?: string | null
          answer_en_norm?: string | null
          answer_fr?: string | null
          answer_fr_norm?: string | null
          category?: string
          created_at?: string
          id?: string
          is_published?: boolean
          question_en?: string | null
          question_en_norm?: string | null
          question_fr?: string | null
          question_fr_norm?: string | null
          search_vector?: unknown
          updated_at?: string
        }
        Update: {
          answer_en?: string | null
          answer_en_norm?: string | null
          answer_fr?: string | null
          answer_fr_norm?: string | null
          category?: string
          created_at?: string
          id?: string
          is_published?: boolean
          question_en?: string | null
          question_en_norm?: string | null
          question_fr?: string | null
          question_fr_norm?: string | null
          search_vector?: unknown
          updated_at?: string
        }
        Relationships: []
      }
      faq_synonyms: {
        Row: {
          created_at: string
          id: string
          lang: string
          synonyms: string[]
          term: string
        }
        Insert: {
          created_at?: string
          id?: string
          lang: string
          synonyms?: string[]
          term: string
        }
        Update: {
          created_at?: string
          id?: string
          lang?: string
          synonyms?: string[]
          term?: string
        }
        Relationships: []
      }
      op_client_worker_messages: {
        Row: {
          client_id: string
          contact_id: string | null
          created_at: string
          id: string
          message: string
          sender_role: string | null
          worker_id: string
          worker_name: string | null
        }
        Insert: {
          client_id: string
          contact_id?: string | null
          created_at?: string
          id?: string
          message: string
          sender_role?: string | null
          worker_id: string
          worker_name?: string | null
        }
        Update: {
          client_id?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          message?: string
          sender_role?: string | null
          worker_id?: string
          worker_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "op_client_worker_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "op_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_client_worker_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "op_ouvrier_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_client_worker_messages_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_client_worker_messages_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      op_clients: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          region: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          region?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          region?: string | null
          user_id?: string
        }
        Relationships: []
      }
      op_clients_backup_20251213: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          phone: string | null
          region: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          phone?: string | null
          region?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          phone?: string | null
          region?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      op_contact_messages: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          ip_hint: string | null
          message: string
          page_url: string | null
          status: Database["public"]["Enums"]["op_contact_status"]
          subject: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          ip_hint?: string | null
          message: string
          page_url?: string | null
          status?: Database["public"]["Enums"]["op_contact_status"]
          subject?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          ip_hint?: string | null
          message?: string
          page_url?: string | null
          status?: Database["public"]["Enums"]["op_contact_status"]
          subject?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      op_faq_question_replies: {
        Row: {
          admin_user_id: string | null
          content: string
          created_at: string
          id: string
          question_id: string
        }
        Insert: {
          admin_user_id?: string | null
          content: string
          created_at?: string
          id?: string
          question_id: string
        }
        Update: {
          admin_user_id?: string | null
          content?: string
          created_at?: string
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_faq_question_replies_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "op_faq_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      op_faq_questions: {
        Row: {
          category: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          message: string
          status: string
          subject: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          message: string
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          message?: string
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      op_login_audit: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device: string | null
          email: string | null
          event: string
          id: number
          ip: unknown
          latitude: number | null
          longitude: number | null
          meta: Json
          region: string | null
          source: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          email?: string | null
          event?: string
          id?: number
          ip?: unknown
          latitude?: number | null
          longitude?: number | null
          meta?: Json
          region?: string | null
          source?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          email?: string | null
          event?: string
          id?: number
          ip?: unknown
          latitude?: number | null
          longitude?: number | null
          meta?: Json
          region?: string | null
          source?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      op_login_journal: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          event: string
          id: string
          ip: string | null
          lat: number | null
          lng: number | null
          meta: Json
          region: string | null
          source: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          event: string
          id?: string
          ip?: string | null
          lat?: number | null
          lng?: number | null
          meta?: Json
          region?: string | null
          source?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          event?: string
          id?: string
          ip?: string | null
          lat?: number | null
          lng?: number | null
          meta?: Json
          region?: string | null
          source?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      op_ouvrier_contacts: {
        Row: {
          client_email: string | null
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
            foreignKeyName: "op_ouvrier_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "op_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_ouvrier_contacts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_ouvrier_contacts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      op_ouvrier_favorites: {
        Row: {
          client_id: string
          created_at: string
          id: string
          profession: string | null
          worker_id: string
          worker_name: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          profession?: string | null
          worker_id: string
          worker_name?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          profession?: string | null
          worker_id?: string
          worker_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "op_ouvrier_favorites_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_ouvrier_favorites_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      op_ouvrier_photos: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_cover: boolean
          public_url: string | null
          storage_path: string
          title: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_cover?: boolean
          public_url?: string | null
          storage_path: string
          title?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_cover?: boolean
          public_url?: string | null
          storage_path?: string
          title?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_ouvrier_photos_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_ouvrier_photos_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      op_ouvrier_portfolio: {
        Row: {
          cover_photo_url: string | null
          created_at: string
          date_completed: string | null
          description: string | null
          id: string
          location: string | null
          title: string | null
          worker_id: string
        }
        Insert: {
          cover_photo_url?: string | null
          created_at?: string
          date_completed?: string | null
          description?: string | null
          id?: string
          location?: string | null
          title?: string | null
          worker_id: string
        }
        Update: {
          cover_photo_url?: string | null
          created_at?: string
          date_completed?: string | null
          description?: string | null
          id?: string
          location?: string | null
          title?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_ouvrier_portfolio_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_ouvrier_portfolio_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      op_ouvrier_portfolio_photos: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["op_portfolio_photo_kind"]
          photo_id: string
          portfolio_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["op_portfolio_photo_kind"]
          photo_id: string
          portfolio_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["op_portfolio_photo_kind"]
          photo_id?: string
          portfolio_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "op_ouvrier_portfolio_photos_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "op_ouvrier_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_ouvrier_portfolio_photos_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "op_ouvrier_portfolio"
            referencedColumns: ["id"]
          },
        ]
      }
      op_ouvrier_projects: {
        Row: {
          budget: string | null
          created_at: string
          description: string | null
          finished_at: string | null
          id: string
          location: string | null
          main_photo_url: string | null
          started_at: string | null
          status: string | null
          title: string
          worker_id: string
        }
        Insert: {
          budget?: string | null
          created_at?: string
          description?: string | null
          finished_at?: string | null
          id?: string
          location?: string | null
          main_photo_url?: string | null
          started_at?: string | null
          status?: string | null
          title: string
          worker_id: string
        }
        Update: {
          budget?: string | null
          created_at?: string
          description?: string | null
          finished_at?: string | null
          id?: string
          location?: string | null
          main_photo_url?: string | null
          started_at?: string | null
          status?: string | null
          title?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_ouvrier_projects_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_ouvrier_projects_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      op_ouvrier_reviews: {
        Row: {
          author_name: string | null
          client_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          rating: number | null
          worker_id: string
        }
        Insert: {
          author_name?: string | null
          client_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          worker_id: string
        }
        Update: {
          author_name?: string | null
          client_id?: string | null
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
          {
            foreignKeyName: "op_ouvrier_reviews_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      op_ouvrier_views: {
        Row: {
          created_at: string
          id: string
          viewer_id: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          viewer_id?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          viewer_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_ouvrier_views_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_ouvrier_views_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      op_ouvriers: {
        Row: {
          approved_at: string | null
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          city: string | null
          commune: string | null
          country: string | null
          created_at: string
          currency: string | null
          deleted_at: string | null
          description: string | null
          district: string | null
          email: string | null
          experience_years: number | null
          first_name: string | null
          geog: unknown
          headline: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean
          is_suspended: boolean
          is_visible: boolean
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
          approved_at?: string | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          city?: string | null
          commune?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          district?: string | null
          email?: string | null
          experience_years?: number | null
          first_name?: string | null
          geog?: unknown
          headline?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          is_suspended?: boolean
          is_visible?: boolean
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
          approved_at?: string | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          city?: string | null
          commune?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          district?: string | null
          email?: string | null
          experience_years?: number | null
          first_name?: string | null
          geog?: unknown
          headline?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          is_suspended?: boolean
          is_visible?: boolean
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
          {
            foreignKeyName: "op_payments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      op_review_reply_votes: {
        Row: {
          created_at: string
          id: string
          reply_id: string
          updated_at: string
          vote_type: string
          voter_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reply_id: string
          updated_at?: string
          vote_type: string
          voter_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reply_id?: string
          updated_at?: string
          vote_type?: string
          voter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_review_reply_votes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "op_worker_client_review_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      op_review_votes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          updated_at: string
          vote_type: string
          voter_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          updated_at?: string
          vote_type: string
          voter_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          updated_at?: string
          vote_type?: string
          voter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_review_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "op_ouvrier_reviews"
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
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          preferred_contact: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          phone?: string | null
          preferred_contact?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          preferred_contact?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      op_worker_client_review_replies: {
        Row: {
          client_id: string | null
          content: string
          created_at: string
          id: string
          review_id: string
          sender_role: string
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          client_id?: string | null
          content: string
          created_at?: string
          id?: string
          review_id: string
          sender_role: string
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          client_id?: string | null
          content?: string
          created_at?: string
          id?: string
          review_id?: string
          sender_role?: string
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "op_worker_client_review_replies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "op_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_worker_client_review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "op_worker_client_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      op_worker_client_reviews: {
        Row: {
          client_id: string
          contact_id: string | null
          content: string
          created_at: string
          id: string
          is_flagged: boolean
          is_published: boolean
          rating: number
          title: string | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          client_id: string
          contact_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_flagged?: boolean
          is_published?: boolean
          rating: number
          title?: string | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          client_id?: string
          contact_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_flagged?: boolean
          is_published?: boolean
          rating?: number
          title?: string | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_worker_client_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "op_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_worker_client_reviews_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "op_ouvrier_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_worker_client_reviews_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_worker_client_reviews_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      op_worker_reviews: {
        Row: {
          client_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          updated_at: string
          worker_id: string
        }
        Insert: {
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          worker_id: string
        }
        Update: {
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_worker_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "op_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_worker_reviews_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_worker_reviews_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers_with_ratings"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "op_worker_services_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers_with_ratings"
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
          {
            foreignKeyName: "op_worker_subscriptions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "op_ouvriers_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_admin: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          is_admin?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          created_at: string
          en_is_auto: boolean
          id: string
          is_published: boolean
          key: string
          locale: string
          type: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          created_at?: string
          en_is_auto?: boolean
          id?: string
          is_published?: boolean
          key: string
          locale?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Update: {
          created_at?: string
          en_is_auto?: boolean
          id?: string
          is_published?: boolean
          key?: string
          locale?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      worker_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_email: string | null
          reporter_name: string | null
          reporter_phone: string | null
          status: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_email?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          status?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_email?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          status?: string
          worker_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      op_ouvriers_with_ratings: {
        Row: {
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          city: string | null
          commune: string | null
          computed_average_rating: number | null
          computed_rating_count: number | null
          country: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          district: string | null
          email: string | null
          experience_years: number | null
          first_name: string | null
          headline: string | null
          hourly_rate: number | null
          id: string | null
          last_name: string | null
          latitude: number | null
          longitude: number | null
          payment_at: string | null
          payment_provider: string | null
          payment_reference: string | null
          payment_status:
            | Database["public"]["Enums"]["op_payment_status"]
            | null
          phone: string | null
          plan_code: string | null
          postal_code: string | null
          profession: string | null
          rating_count: number | null
          region: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["op_worker_status"] | null
          updated_at: string | null
          user_id: string | null
          validated_at: string | null
          validated_by: string | null
          years_experience: number | null
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
      v_op_reply_votes_counts: {
        Row: {
          likes: number | null
          not_useful: number | null
          reply_id: string | null
          useful: number | null
        }
        Relationships: [
          {
            foreignKeyName: "op_review_reply_votes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "op_worker_client_review_replies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      is_admin: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      op_is_admin: { Args: never; Returns: boolean }
      op_log_login_event: {
        Args: {
          p_city: string
          p_country: string
          p_email: string
          p_event: string
          p_ip: string
          p_lat: number
          p_lng: number
          p_meta: Json
          p_region: string
          p_source: string
          p_success: boolean
          p_user_agent: string
        }
        Returns: string
      }
      op_search_workers_nearby: {
        Args: {
          p_limit?: number
          p_profession: string
          p_radius_km?: number
          p_user_lat: number
          p_user_lng: number
        }
        Returns: {
          avatar_url: string
          average_rating: number
          city: string
          commune: string
          country: string
          currency: string
          distance_km: number
          district: string
          email: string
          first_name: string
          hourly_rate: number
          id: string
          last_name: string
          latitude: number
          longitude: number
          phone: string
          profession: string
          rating_count: number
        }[]
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      refresh_worker_rating: {
        Args: { p_worker_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unaccent: { Args: { "": string }; Returns: string }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      ad_campaign_status: "draft" | "published" | "paused" | "ended"
      ad_media_type: "image" | "video" | "lottie"
      op_contact_status: "new" | "answered"
      op_payment_status: "unpaid" | "paid" | "failed"
      op_portfolio_photo_kind: "before" | "after" | "other"
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
      report_reason:
        | "spam"
        | "fraud"
        | "impersonation"
        | "inappropriate_content"
        | "harassment"
        | "pricing_scam"
        | "other"
      user_role: "user" | "admin" | "worker"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      ad_campaign_status: ["draft", "published", "paused", "ended"],
      ad_media_type: ["image", "video", "lottie"],
      op_contact_status: ["new", "answered"],
      op_payment_status: ["unpaid", "paid", "failed"],
      op_portfolio_photo_kind: ["before", "after", "other"],
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
      report_reason: [
        "spam",
        "fraud",
        "impersonation",
        "inappropriate_content",
        "harassment",
        "pricing_scam",
        "other",
      ],
      user_role: ["user", "admin", "worker"],
    },
  },
} as const
