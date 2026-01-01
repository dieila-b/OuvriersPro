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
    }
    Views: {
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
      is_admin: { Args: never; Returns: boolean }
      op_is_admin: { Args: never; Returns: boolean }
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
      refresh_worker_rating: {
        Args: { p_worker_id: string }
        Returns: undefined
      }
    }
    Enums: {
      ad_campaign_status: "draft" | "published" | "paused" | "ended"
      ad_media_type: "image" | "video" | "lottie"
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
      ad_campaign_status: ["draft", "published", "paused", "ended"],
      ad_media_type: ["image", "video", "lottie"],
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
