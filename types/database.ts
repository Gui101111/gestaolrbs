export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      brand_kits: {
        Row: {
          accent_color: string;
          created_at: string;
          font: string | null;
          id: string;
          instagram: string | null;
          logo_path: string | null;
          oab_display: string | null;
          office_name: string | null;
          primary_color: string;
          professional_name: string | null;
          secondary_color: string;
          updated_at: string;
          user_id: string;
          website: string | null;
          whatsapp: string | null;
        };
        ComputedFields: never;
        Insert: {
          accent_color?: string;
          created_at?: string;
          font?: string | null;
          id?: string;
          instagram?: string | null;
          logo_path?: string | null;
          oab_display?: string | null;
          office_name?: string | null;
          primary_color?: string;
          professional_name?: string | null;
          secondary_color?: string;
          updated_at?: string;
          user_id: string;
          website?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          accent_color?: string;
          created_at?: string;
          font?: string | null;
          id?: string;
          instagram?: string | null;
          logo_path?: string | null;
          oab_display?: string | null;
          office_name?: string | null;
          primary_color?: string;
          professional_name?: string | null;
          secondary_color?: string;
          updated_at?: string;
          user_id?: string;
          website?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          link: string | null;
          read_at: string | null;
          title: string;
          type: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title: string;
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title?: string;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount_cents: number;
          billing_type: string | null;
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: string;
          invoice_url: string | null;
          paid_at: string | null;
          provider: string;
          provider_payment_id: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          subscription_id: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount_cents?: number;
          billing_type?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          invoice_url?: string | null;
          paid_at?: string | null;
          provider: string;
          provider_payment_id?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          subscription_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_cents?: number;
          billing_type?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          invoice_url?: string | null;
          paid_at?: string | null;
          provider?: string;
          provider_payment_id?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          subscription_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          allowed_aspect_ratios: string[];
          billing_interval: string;
          created_at: string;
          currency: string;
          description: string | null;
          features: string[];
          id: string;
          is_active: boolean;
          is_featured: boolean;
          is_public: boolean;
          max_resolution: string;
          max_upload_mb: number;
          max_video_duration_sec: number | null;
          minutes_per_month: number | null;
          name: string;
          price_cents: number | null;
          render_priority: string;
          revisions_per_video: number;
          slug: string;
          sort_order: number;
          storage_gb: number | null;
          trial_days: number | null;
          updated_at: string;
          videos_per_month: number | null;
        };
        ComputedFields: never;
        Insert: {
          allowed_aspect_ratios?: string[];
          billing_interval?: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          features?: string[];
          id?: string;
          is_active?: boolean;
          is_featured?: boolean;
          is_public?: boolean;
          max_resolution?: string;
          max_upload_mb?: number;
          max_video_duration_sec?: number | null;
          minutes_per_month?: number | null;
          name: string;
          price_cents?: number | null;
          render_priority?: string;
          revisions_per_video?: number;
          slug: string;
          sort_order?: number;
          storage_gb?: number | null;
          trial_days?: number | null;
          updated_at?: string;
          videos_per_month?: number | null;
        };
        Update: {
          allowed_aspect_ratios?: string[];
          billing_interval?: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          features?: string[];
          id?: string;
          is_active?: boolean;
          is_featured?: boolean;
          is_public?: boolean;
          max_resolution?: string;
          max_upload_mb?: number;
          max_video_duration_sec?: number | null;
          minutes_per_month?: number | null;
          name?: string;
          price_cents?: number | null;
          render_priority?: string;
          revisions_per_video?: number;
          slug?: string;
          sort_order?: number;
          storage_gb?: number | null;
          trial_days?: number | null;
          updated_at?: string;
          videos_per_month?: number | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          default_editing_style: string | null;
          default_platforms: string[];
          email: string | null;
          full_name: string | null;
          id: string;
          legal_area: string | null;
          main_goal: string | null;
          oab_number: string | null;
          oab_uf: string | null;
          office_name: string | null;
          onboarding_completed_at: string | null;
          phone: string | null;
          practice_areas: string[];
          preferences: NonNullable<Json>;
          role: Database["public"]["Enums"]["user_role"];
          terms_accepted_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          default_editing_style?: string | null;
          default_platforms?: string[];
          email?: string | null;
          full_name?: string | null;
          id: string;
          legal_area?: string | null;
          main_goal?: string | null;
          oab_number?: string | null;
          oab_uf?: string | null;
          office_name?: string | null;
          onboarding_completed_at?: string | null;
          phone?: string | null;
          practice_areas?: string[];
          preferences?: NonNullable<Json>;
          role?: Database["public"]["Enums"]["user_role"];
          terms_accepted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          default_editing_style?: string | null;
          default_platforms?: string[];
          email?: string | null;
          full_name?: string | null;
          id?: string;
          legal_area?: string | null;
          main_goal?: string | null;
          oab_number?: string | null;
          oab_uf?: string | null;
          office_name?: string | null;
          onboarding_completed_at?: string | null;
          phone?: string | null;
          practice_areas?: string[];
          preferences?: NonNullable<Json>;
          role?: Database["public"]["Enums"]["user_role"];
          terms_accepted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_files: {
        Row: {
          bucket: string;
          created_at: string;
          duration_sec: number | null;
          file_name: string;
          height: number | null;
          id: string;
          kind: Database["public"]["Enums"]["file_kind"];
          mime_type: string | null;
          project_id: string;
          size_bytes: number | null;
          sort_order: number;
          status: Database["public"]["Enums"]["upload_status"];
          storage_path: string;
          updated_at: string;
          user_id: string;
          width: number | null;
        };
        ComputedFields: never;
        Insert: {
          bucket?: string;
          created_at?: string;
          duration_sec?: number | null;
          file_name: string;
          height?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["file_kind"];
          mime_type?: string | null;
          project_id: string;
          size_bytes?: number | null;
          sort_order?: number;
          status?: Database["public"]["Enums"]["upload_status"];
          storage_path: string;
          updated_at?: string;
          user_id: string;
          width?: number | null;
        };
        Update: {
          bucket?: string;
          created_at?: string;
          duration_sec?: number | null;
          file_name?: string;
          height?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["file_kind"];
          mime_type?: string | null;
          project_id?: string;
          size_bytes?: number | null;
          sort_order?: number;
          status?: Database["public"]["Enums"]["upload_status"];
          storage_path?: string;
          updated_at?: string;
          user_id?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_notes: {
        Row: {
          author_id: string | null;
          body: string;
          created_at: string;
          id: string;
          project_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string | null;
          body: string;
          created_at?: string;
          id?: string;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_notes_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_revisions: {
        Row: {
          comment: string;
          created_at: string;
          id: string;
          project_id: string;
          resolved_at: string | null;
          status: Database["public"]["Enums"]["revision_status"];
          timestamp_sec: number | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          comment: string;
          created_at?: string;
          id?: string;
          project_id: string;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["revision_status"];
          timestamp_sec?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          comment?: string;
          created_at?: string;
          id?: string;
          project_id?: string;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["revision_status"];
          timestamp_sec?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_revisions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          aspect_ratio: string | null;
          aspect_ratios: string[];
          completed_at: string | null;
          created_at: string;
          editing_style: string | null;
          id: string;
          instructions: string | null;
          legal_area: string | null;
          name: string;
          objective: string | null;
          options: NonNullable<Json>;
          parent_project_id: string | null;
          platforms: string[];
          revisions_used: number;
          rights_confirmed_at: string | null;
          settings: NonNullable<Json>;
          source_duration_sec: number | null;
          source_height: number | null;
          source_size_bytes: number | null;
          source_width: number | null;
          status: Database["public"]["Enums"]["project_status"];
          submitted_at: string | null;
          thumbnail_path: string | null;
          updated_at: string;
          user_id: string;
          version: number;
          wizard_step: number;
        };
        ComputedFields: never;
        Insert: {
          aspect_ratio?: never;
          aspect_ratios?: string[];
          completed_at?: string | null;
          created_at?: string;
          editing_style?: string | null;
          id?: string;
          instructions?: string | null;
          legal_area?: string | null;
          name?: string;
          objective?: string | null;
          options?: NonNullable<Json>;
          parent_project_id?: string | null;
          platforms?: string[];
          revisions_used?: number;
          rights_confirmed_at?: string | null;
          settings?: NonNullable<Json>;
          source_duration_sec?: number | null;
          source_height?: number | null;
          source_size_bytes?: number | null;
          source_width?: number | null;
          status?: Database["public"]["Enums"]["project_status"];
          submitted_at?: string | null;
          thumbnail_path?: string | null;
          updated_at?: string;
          user_id: string;
          version?: number;
          wizard_step?: number;
        };
        Update: {
          aspect_ratio?: never;
          aspect_ratios?: string[];
          completed_at?: string | null;
          created_at?: string;
          editing_style?: string | null;
          id?: string;
          instructions?: string | null;
          legal_area?: string | null;
          name?: string;
          objective?: string | null;
          options?: NonNullable<Json>;
          parent_project_id?: string | null;
          platforms?: string[];
          revisions_used?: number;
          rights_confirmed_at?: string | null;
          settings?: NonNullable<Json>;
          source_duration_sec?: number | null;
          source_height?: number | null;
          source_size_bytes?: number | null;
          source_width?: number | null;
          status?: Database["public"]["Enums"]["project_status"];
          submitted_at?: string | null;
          thumbnail_path?: string | null;
          updated_at?: string;
          user_id?: string;
          version?: number;
          wizard_step?: number;
        };
        Relationships: [
          {
            foreignKeyName: "projects_parent_project_id_fkey";
            columns: ["parent_project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      render_jobs: {
        Row: {
          attempts: number;
          brief: Json | null;
          completed_at: string | null;
          created_at: string;
          current_step: string;
          edit_plan: Json | null;
          error_code: string | null;
          error_message: string | null;
          external_id: string | null;
          id: string;
          kind: string;
          progress: number;
          project_id: string;
          provider: string;
          started_at: string | null;
          status: Database["public"]["Enums"]["job_status"];
          step_history: NonNullable<Json>;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          brief?: Json | null;
          completed_at?: string | null;
          created_at?: string;
          current_step?: string;
          edit_plan?: Json | null;
          error_code?: string | null;
          error_message?: string | null;
          external_id?: string | null;
          id?: string;
          kind?: string;
          progress?: number;
          project_id: string;
          provider?: string;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["job_status"];
          step_history?: NonNullable<Json>;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          brief?: Json | null;
          completed_at?: string | null;
          created_at?: string;
          current_step?: string;
          edit_plan?: Json | null;
          error_code?: string | null;
          error_message?: string | null;
          external_id?: string | null;
          id?: string;
          kind?: string;
          progress?: number;
          project_id?: string;
          provider?: string;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["job_status"];
          step_history?: NonNullable<Json>;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "render_jobs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      renders: {
        Row: {
          aspect_ratio: string;
          bucket: string;
          created_at: string;
          duration_sec: number | null;
          file_name: string | null;
          file_size: number | null;
          height: number | null;
          id: string;
          job_id: string | null;
          project_id: string;
          resolution: string | null;
          storage_path: string;
          thumbnail_path: string | null;
          updated_at: string;
          user_id: string;
          version: number;
          width: number | null;
        };
        ComputedFields: never;
        Insert: {
          aspect_ratio: string;
          bucket?: string;
          created_at?: string;
          duration_sec?: number | null;
          file_name?: string | null;
          file_size?: number | null;
          height?: number | null;
          id?: string;
          job_id?: string | null;
          project_id: string;
          resolution?: string | null;
          storage_path: string;
          thumbnail_path?: string | null;
          updated_at?: string;
          user_id: string;
          version?: number;
          width?: number | null;
        };
        Update: {
          aspect_ratio?: string;
          bucket?: string;
          created_at?: string;
          duration_sec?: number | null;
          file_name?: string | null;
          file_size?: number | null;
          height?: number | null;
          id?: string;
          job_id?: string | null;
          project_id?: string;
          resolution?: string | null;
          storage_path?: string;
          thumbnail_path?: string | null;
          updated_at?: string;
          user_id?: string;
          version?: number;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "renders_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "render_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "renders_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          plan_id: string | null;
          provider: string;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          status: Database["public"]["Enums"]["subscription_status"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          plan_id?: string | null;
          provider?: string;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          plan_id?: string | null;
          provider?: string;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      usage: {
        Row: {
          created_at: string;
          id: string;
          minutes_used: number;
          period_end: string;
          period_start: string;
          storage_bytes: number;
          updated_at: string;
          user_id: string;
          videos_created: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          minutes_used?: number;
          period_end: string;
          period_start: string;
          storage_bytes?: number;
          updated_at?: string;
          user_id: string;
          videos_created?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          minutes_used?: number;
          period_end?: string;
          period_start?: string;
          storage_bytes?: number;
          updated_at?: string;
          user_id?: string;
          videos_created?: number;
        };
        Relationships: [];
      };
      waitlist: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          plan_slug: string | null;
          source: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          plan_slug?: string | null;
          source?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          plan_slug?: string | null;
          source?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      approve_project: {
        Args: { p_project_id: string };
        Returns: {
          aspect_ratio: string | null;
          aspect_ratios: string[];
          completed_at: string | null;
          created_at: string;
          editing_style: string | null;
          id: string;
          instructions: string | null;
          legal_area: string | null;
          name: string;
          objective: string | null;
          options: NonNullable<Json>;
          parent_project_id: string | null;
          platforms: string[];
          revisions_used: number;
          rights_confirmed_at: string | null;
          settings: NonNullable<Json>;
          source_duration_sec: number | null;
          source_height: number | null;
          source_size_bytes: number | null;
          source_width: number | null;
          status: Database["public"]["Enums"]["project_status"];
          submitted_at: string | null;
          thumbnail_path: string | null;
          updated_at: string;
          user_id: string;
          version: number;
          wizard_step: number;
        };
        SetofOptions: {
          from: "*";
          to: "projects";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      duplicate_project: {
        Args: { p_as_version?: boolean; p_project_id: string };
        Returns: {
          aspect_ratio: string | null;
          aspect_ratios: string[];
          completed_at: string | null;
          created_at: string;
          editing_style: string | null;
          id: string;
          instructions: string | null;
          legal_area: string | null;
          name: string;
          objective: string | null;
          options: NonNullable<Json>;
          parent_project_id: string | null;
          platforms: string[];
          revisions_used: number;
          rights_confirmed_at: string | null;
          settings: NonNullable<Json>;
          source_duration_sec: number | null;
          source_height: number | null;
          source_size_bytes: number | null;
          source_width: number | null;
          status: Database["public"]["Enums"]["project_status"];
          submitted_at: string | null;
          thumbnail_path: string | null;
          updated_at: string;
          user_id: string;
          version: number;
          wizard_step: number;
        };
        SetofOptions: {
          from: "*";
          to: "projects";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      ensure_usage: {
        Args: { p_user: string };
        Returns: {
          created_at: string;
          id: string;
          minutes_used: number;
          period_end: string;
          period_start: string;
          storage_bytes: number;
          updated_at: string;
          user_id: string;
          videos_created: number;
        };
        SetofOptions: {
          from: "*";
          to: "usage";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_my_usage: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          id: string;
          minutes_used: number;
          period_end: string;
          period_start: string;
          storage_bytes: number;
          updated_at: string;
          user_id: string;
          videos_created: number;
        };
        SetofOptions: {
          from: "*";
          to: "usage";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      request_revision: {
        Args: { p_comment: string; p_project_id: string; p_timestamp_sec?: number };
        Returns: {
          comment: string;
          created_at: string;
          id: string;
          project_id: string;
          resolved_at: string | null;
          status: Database["public"]["Enums"]["revision_status"];
          timestamp_sec: number | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "project_revisions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_project: {
        Args: { p_project_id: string };
        Returns: {
          attempts: number;
          brief: Json | null;
          completed_at: string | null;
          created_at: string;
          current_step: string;
          edit_plan: Json | null;
          error_code: string | null;
          error_message: string | null;
          external_id: string | null;
          id: string;
          kind: string;
          progress: number;
          project_id: string;
          provider: string;
          started_at: string | null;
          status: Database["public"]["Enums"]["job_status"];
          step_history: NonNullable<Json>;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "render_jobs";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      file_kind: "original" | "take" | "attachment";
      job_status: "queued" | "running" | "succeeded" | "failed" | "canceled";
      payment_status:
        | "pending"
        | "confirmed"
        | "received"
        | "overdue"
        | "refunded"
        | "failed"
        | "canceled";
      project_status:
        | "draft"
        | "queued"
        | "processing"
        | "ready"
        | "revision_requested"
        | "completed"
        | "failed";
      revision_status: "open" | "in_progress" | "resolved";
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "expired";
      upload_status: "pending" | "uploading" | "uploaded" | "failed";
      user_role: "user" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      file_kind: ["original", "take", "attachment"],
      job_status: ["queued", "running", "succeeded", "failed", "canceled"],
      payment_status: [
        "pending",
        "confirmed",
        "received",
        "overdue",
        "refunded",
        "failed",
        "canceled",
      ],
      project_status: [
        "draft",
        "queued",
        "processing",
        "ready",
        "revision_requested",
        "completed",
        "failed",
      ],
      revision_status: ["open", "in_progress", "resolved"],
      subscription_status: ["trialing", "active", "past_due", "canceled", "incomplete", "expired"],
      upload_status: ["pending", "uploading", "uploaded", "failed"],
      user_role: ["user", "admin"],
    },
  },
} as const;
