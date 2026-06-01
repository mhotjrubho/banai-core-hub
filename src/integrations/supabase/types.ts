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
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          priority: string | null
          reporter_id: string | null
          resolution_notes: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          reporter_id?: string | null
          resolution_notes?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          reporter_id?: string | null
          resolution_notes?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          channel: string
          channel_id: string | null
          content: string
          created_at: string
          id: string
          is_read: boolean
          metadata: Json | null
          recipient_id: string | null
          sender_id: string | null
          updated_at: string
        }
        Insert: {
          channel?: string
          channel_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          recipient_id?: string | null
          sender_id?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          channel_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          recipient_id?: string | null
          sender_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string
          district_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          district_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          district_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          address: string | null
          city_id: string
          coordinator_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city_id: string
          coordinator_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city_id?: string
          coordinator_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      event_expense_items: {
        Row: {
          actual_cost: number | null
          created_at: string
          estimated_cost: number
          event_id: string
          id: string
          item_name: string
          notes: string | null
          quantity: number | null
          unit: string | null
          vendor_id: string | null
        }
        Insert: {
          actual_cost?: number | null
          created_at?: string
          estimated_cost?: number
          event_id: string
          id?: string
          item_name: string
          notes?: string | null
          quantity?: number | null
          unit?: string | null
          vendor_id?: string | null
        }
        Update: {
          actual_cost?: number | null
          created_at?: string
          estimated_cost?: number
          event_id?: string
          id?: string
          item_name?: string
          notes?: string | null
          quantity?: number | null
          unit?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_expense_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          actual_participants: number | null
          approved_at: string | null
          approved_by: string | null
          city_id: string | null
          community_ids: string[] | null
          created_at: string
          created_by: string | null
          district_id: string | null
          end_at: string | null
          event_type: string
          expected_participants: number | null
          id: string
          logistics_notes: string | null
          pickup_details: string | null
          rejection_reason: string | null
          requesting_staff_id: string | null
          required_activities: string | null
          serial_number: number
          start_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          total_budget_approved: number | null
          total_budget_requested: number | null
          updated_at: string
        }
        Insert: {
          actual_participants?: number | null
          approved_at?: string | null
          approved_by?: string | null
          city_id?: string | null
          community_ids?: string[] | null
          created_at?: string
          created_by?: string | null
          district_id?: string | null
          end_at?: string | null
          event_type: string
          expected_participants?: number | null
          id?: string
          logistics_notes?: string | null
          pickup_details?: string | null
          rejection_reason?: string | null
          requesting_staff_id?: string | null
          required_activities?: string | null
          serial_number?: number
          start_at: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          total_budget_approved?: number | null
          total_budget_requested?: number | null
          updated_at?: string
        }
        Update: {
          actual_participants?: number | null
          approved_at?: string | null
          approved_by?: string | null
          city_id?: string | null
          community_ids?: string[] | null
          created_at?: string
          created_by?: string | null
          district_id?: string | null
          end_at?: string | null
          event_type?: string
          expected_participants?: number | null
          id?: string
          logistics_notes?: string | null
          pickup_details?: string | null
          rejection_reason?: string | null
          requesting_staff_id?: string | null
          required_activities?: string | null
          serial_number?: number
          start_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          total_budget_approved?: number | null
          total_budget_requested?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_requesting_staff_id_fkey"
            columns: ["requesting_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      form_definitions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_public: boolean
          name: string
          public_token: string | null
          purpose: string | null
          slug: string
          target_table: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name: string
          public_token?: string | null
          purpose?: string | null
          slug: string
          target_table?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name?: string
          public_token?: string | null
          purpose?: string | null
          slug?: string
          target_table?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      form_fields: {
        Row: {
          conditional_logic: Json | null
          created_at: string
          field_key: string
          field_type: Database["public"]["Enums"]["form_field_type"]
          form_id: string
          help_text: string | null
          id: string
          is_required: boolean
          label: string
          options: Json | null
          placeholder: string | null
          sort_order: number
          validation: Json | null
        }
        Insert: {
          conditional_logic?: Json | null
          created_at?: string
          field_key: string
          field_type: Database["public"]["Enums"]["form_field_type"]
          form_id: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          label: string
          options?: Json | null
          placeholder?: string | null
          sort_order?: number
          validation?: Json | null
        }
        Update: {
          conditional_logic?: Json | null
          created_at?: string
          field_key?: string
          field_type?: Database["public"]["Enums"]["form_field_type"]
          form_id?: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          label?: string
          options?: Json | null
          placeholder?: string | null
          sort_order?: number
          validation?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string
          form_id: string
          id: string
          payload: Json
          source: Database["public"]["Enums"]["submission_source"]
          source_ip: string | null
          submitted_by: string | null
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          payload?: Json
          source?: Database["public"]["Enums"]["submission_source"]
          source_ip?: string | null
          submitted_by?: string | null
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          payload?: Json
          source?: Database["public"]["Enums"]["submission_source"]
          source_ip?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      graphics_revisions: {
        Row: {
          created_at: string
          feedback: string | null
          file_path: string | null
          id: string
          status: Database["public"]["Enums"]["graphics_status"]
          submitted_by: string | null
          task_id: string
          version: number
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          file_path?: string | null
          id?: string
          status: Database["public"]["Enums"]["graphics_status"]
          submitted_by?: string | null
          task_id: string
          version?: number
        }
        Update: {
          created_at?: string
          feedback?: string | null
          file_path?: string | null
          id?: string
          status?: Database["public"]["Enums"]["graphics_status"]
          submitted_by?: string | null
          task_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "graphics_revisions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "graphics_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      graphics_tasks: {
        Row: {
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          designer_id: string | null
          dimensions: string | null
          event_id: string | null
          id: string
          output_type: string | null
          reference_files: string[] | null
          status: Database["public"]["Enums"]["graphics_status"]
          text_content: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          designer_id?: string | null
          dimensions?: string | null
          event_id?: string | null
          id?: string
          output_type?: string | null
          reference_files?: string[] | null
          status?: Database["public"]["Enums"]["graphics_status"]
          text_content?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          designer_id?: string | null
          dimensions?: string | null
          event_id?: string | null
          id?: string
          output_type?: string | null
          reference_files?: string[] | null
          status?: Database["public"]["Enums"]["graphics_status"]
          text_content?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "graphics_tasks_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graphics_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      inspector_reports: {
        Row: {
          actual_participants: number
          city_id: string | null
          community_id: string | null
          conversation_details: string | null
          created_at: string
          district_id: string | null
          expected_participants: number | null
          experience_summary: string | null
          id: string
          inspector_id: string | null
          notes: string | null
          photos: string[] | null
          rating: number | null
          updated_at: string
          visit_date: string
          visit_time: string | null
          yeshiva_id: string | null
        }
        Insert: {
          actual_participants: number
          city_id?: string | null
          community_id?: string | null
          conversation_details?: string | null
          created_at?: string
          district_id?: string | null
          expected_participants?: number | null
          experience_summary?: string | null
          id?: string
          inspector_id?: string | null
          notes?: string | null
          photos?: string[] | null
          rating?: number | null
          updated_at?: string
          visit_date: string
          visit_time?: string | null
          yeshiva_id?: string | null
        }
        Update: {
          actual_participants?: number
          city_id?: string | null
          community_id?: string | null
          conversation_details?: string | null
          created_at?: string
          district_id?: string | null
          expected_participants?: number | null
          experience_summary?: string | null
          id?: string
          inspector_id?: string | null
          notes?: string | null
          photos?: string[] | null
          rating?: number | null
          updated_at?: string
          visit_date?: string
          visit_time?: string | null
          yeshiva_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspector_reports_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspector_reports_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspector_reports_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspector_reports_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspector_reports_yeshiva_id_fkey"
            columns: ["yeshiva_id"]
            isOneToOne: false
            referencedRelation: "yeshivas"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_settings: {
        Row: {
          channels: string[] | null
          created_at: string
          id: string
          is_enabled: boolean
          notify_on: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          channels?: string[] | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          notify_on?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          channels?: string[] | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          notify_on?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          description: string | null
          id: string
          key: string
          module: string
        }
        Insert: {
          action: string
          description?: string | null
          id?: string
          key: string
          module: string
        }
        Update: {
          action?: string
          description?: string | null
          id?: string
          key?: string
          module?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city_id: string | null
          community_id: string | null
          created_at: string
          district_id: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          national_id: string | null
          phone: string | null
          scope_level: Database["public"]["Enums"]["scope_level"]
          updated_at: string
          user_id: string
        }
        Insert: {
          city_id?: string | null
          community_id?: string | null
          created_at?: string
          district_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          national_id?: string | null
          phone?: string | null
          scope_level?: Database["public"]["Enums"]["scope_level"]
          updated_at?: string
          user_id: string
        }
        Update: {
          city_id?: string | null
          community_id?: string | null
          created_at?: string
          district_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          national_id?: string | null
          phone?: string | null
          scope_level?: Database["public"]["Enums"]["scope_level"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          bank_account: string | null
          bank_branch: string | null
          bank_name: string | null
          city_id: string | null
          community_id: string | null
          created_at: string
          district_id: string | null
          email: string | null
          first_name: string
          id: string
          initial_terms: Json | null
          is_active: boolean
          last_name: string
          national_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["staff_role"]
          salary_model: Database["public"]["Enums"]["salary_model"]
          staff_group: Database["public"]["Enums"]["staff_group"] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          city_id?: string | null
          community_id?: string | null
          created_at?: string
          district_id?: string | null
          email?: string | null
          first_name: string
          id?: string
          initial_terms?: Json | null
          is_active?: boolean
          last_name: string
          national_id?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["staff_role"]
          salary_model?: Database["public"]["Enums"]["salary_model"]
          staff_group?: Database["public"]["Enums"]["staff_group"] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          city_id?: string | null
          community_id?: string | null
          created_at?: string
          district_id?: string | null
          email?: string | null
          first_name?: string
          id?: string
          initial_terms?: Json | null
          is_active?: boolean
          last_name?: string
          national_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          salary_model?: Database["public"]["Enums"]["salary_model"]
          staff_group?: Database["public"]["Enums"]["staff_group"] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_contracts: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          fixed_monthly: number | null
          hourly_rate: number | null
          id: string
          notes: string | null
          per_event_rate: number | null
          salary_model: Database["public"]["Enums"]["salary_model"]
          staff_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          fixed_monthly?: number | null
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          per_event_rate?: number | null
          salary_model: Database["public"]["Enums"]["salary_model"]
          staff_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          fixed_monthly?: number | null
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          per_event_rate?: number | null
          salary_model?: Database["public"]["Enums"]["salary_model"]
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_contracts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          community_id: string | null
          created_at: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          national_id: string | null
          notes: string | null
          parent1_phone: string | null
          parent2_phone: string | null
          phone: string | null
          shiur: string | null
          smart_card_external_id: string | null
          smart_card_status: Database["public"]["Enums"]["smart_card_status"]
          updated_at: string
          yeshiva_id: string | null
        }
        Insert: {
          community_id?: string | null
          created_at?: string
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          national_id?: string | null
          notes?: string | null
          parent1_phone?: string | null
          parent2_phone?: string | null
          phone?: string | null
          shiur?: string | null
          smart_card_external_id?: string | null
          smart_card_status?: Database["public"]["Enums"]["smart_card_status"]
          updated_at?: string
          yeshiva_id?: string | null
        }
        Update: {
          community_id?: string | null
          created_at?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          national_id?: string | null
          notes?: string | null
          parent1_phone?: string | null
          parent2_phone?: string | null
          phone?: string | null
          shiur?: string | null
          smart_card_external_id?: string | null
          smart_card_status?: Database["public"]["Enums"]["smart_card_status"]
          updated_at?: string
          yeshiva_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_yeshiva_id_fkey"
            columns: ["yeshiva_id"]
            isOneToOne: false
            referencedRelation: "yeshivas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          granted: boolean
          granted_by: string | null
          id: string
          permission_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          granted_by?: string | null
          id?: string
          permission_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          granted_by?: string | null
          id?: string
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          insurance_valid_until: string | null
          is_active: boolean
          name: string
          notes: string | null
          operating_regions: string[] | null
          phone: string | null
          rate: number | null
          rate_unit: string | null
          safety_approval_valid_until: string | null
          updated_at: string
          vendor_type: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          insurance_valid_until?: string | null
          is_active?: boolean
          name: string
          notes?: string | null
          operating_regions?: string[] | null
          phone?: string | null
          rate?: number | null
          rate_unit?: string | null
          safety_approval_valid_until?: string | null
          updated_at?: string
          vendor_type: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          insurance_valid_until?: string | null
          is_active?: boolean
          name?: string
          notes?: string | null
          operating_regions?: string[] | null
          phone?: string | null
          rate?: number | null
          rate_unit?: string | null
          safety_approval_valid_until?: string | null
          updated_at?: string
          vendor_type?: string
        }
        Relationships: []
      }
      webhook_endpoints: {
        Row: {
          created_at: string
          description: string | null
          field_mapping: Json
          id: string
          is_active: boolean
          name: string
          notify_on_failure: boolean
          secret_key: string | null
          source: string
          target_table: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          field_mapping?: Json
          id?: string
          is_active?: boolean
          name: string
          notify_on_failure?: boolean
          secret_key?: string | null
          source: string
          target_table?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          field_mapping?: Json
          id?: string
          is_active?: boolean
          name?: string
          notify_on_failure?: boolean
          secret_key?: string | null
          source?: string
          target_table?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      webhook_log: {
        Row: {
          created_at: string
          direction: string
          endpoint: string | null
          error_message: string | null
          http_method: string | null
          id: string
          request_body: Json | null
          request_headers: Json | null
          response_body: Json | null
          source: string
          status_code: number | null
          success: boolean
        }
        Insert: {
          created_at?: string
          direction: string
          endpoint?: string | null
          error_message?: string | null
          http_method?: string | null
          id?: string
          request_body?: Json | null
          request_headers?: Json | null
          response_body?: Json | null
          source: string
          status_code?: number | null
          success?: boolean
        }
        Update: {
          created_at?: string
          direction?: string
          endpoint?: string | null
          error_message?: string | null
          http_method?: string | null
          id?: string
          request_body?: Json | null
          request_headers?: Json | null
          response_body?: Json | null
          source?: string
          status_code?: number | null
          success?: boolean
        }
        Relationships: []
      }
      yeshivas: {
        Row: {
          address: string | null
          community_id: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          community_id?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          community_id?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "yeshivas_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_roles: { Args: { _user_id: string }; Returns: string[] }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "finance"
        | "secretary"
        | "district_head"
        | "city_coordinator"
        | "community_coordinator"
        | "field_coordinator"
        | "trip_coordinator"
        | "designer"
        | "inspector"
        | "developer"
        | "ceo"
        | "employee"
        | "student"
      event_status:
        | "draft"
        | "requested"
        | "admin_approved"
        | "logistics_approved"
        | "in_progress"
        | "completed"
        | "rejected"
        | "cancelled"
      form_field_type:
        | "text"
        | "textarea"
        | "number"
        | "date"
        | "datetime"
        | "time"
        | "select"
        | "multiselect"
        | "checkbox"
        | "radio"
        | "file"
        | "phone"
        | "email"
        | "id_number"
      graphics_status:
        | "pending"
        | "in_progress"
        | "sketch_uploaded"
        | "revision_requested"
        | "approved"
        | "cancelled"
      salary_model: "fixed" | "hourly" | "per_event"
      scope_level: "global" | "district" | "city" | "community"
      smart_card_status: "none" | "pending" | "active" | "suspended"
      staff_group: "boys" | "girls" | "boys_ethiopian"
      staff_role:
        | "head_coordinator"
        | "district"
        | "city"
        | "field"
        | "trip"
        | "designer"
        | "inspector"
        | "other"
      submission_source: "manual" | "public_link" | "webhook" | "import"
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
      app_role: [
        "super_admin",
        "finance",
        "secretary",
        "district_head",
        "city_coordinator",
        "community_coordinator",
        "field_coordinator",
        "trip_coordinator",
        "designer",
        "inspector",
        "developer",
        "ceo",
        "employee",
        "student",
      ],
      event_status: [
        "draft",
        "requested",
        "admin_approved",
        "logistics_approved",
        "in_progress",
        "completed",
        "rejected",
        "cancelled",
      ],
      form_field_type: [
        "text",
        "textarea",
        "number",
        "date",
        "datetime",
        "time",
        "select",
        "multiselect",
        "checkbox",
        "radio",
        "file",
        "phone",
        "email",
        "id_number",
      ],
      graphics_status: [
        "pending",
        "in_progress",
        "sketch_uploaded",
        "revision_requested",
        "approved",
        "cancelled",
      ],
      salary_model: ["fixed", "hourly", "per_event"],
      scope_level: ["global", "district", "city", "community"],
      smart_card_status: ["none", "pending", "active", "suspended"],
      staff_group: ["boys", "girls", "boys_ethiopian"],
      staff_role: [
        "head_coordinator",
        "district",
        "city",
        "field",
        "trip",
        "designer",
        "inspector",
        "other",
      ],
      submission_source: ["manual", "public_link", "webhook", "import"],
    },
  },
} as const
