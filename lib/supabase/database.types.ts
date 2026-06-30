/**
 * TypeScript types for Supabase database schema
 * Generated from the database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          company_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          company_id: string | null;
          full_name: string;
          email: string;
          avatar_url: string | null;
          role: 'admin' | 'worker';
          created_at: string;
        };
        Insert: {
          id: string;
          company_id?: string | null;
          full_name: string;
          email: string;
          avatar_url?: string | null;
          role: 'admin' | 'worker';
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          full_name?: string;
          email?: string;
          avatar_url?: string | null;
          role?: 'admin' | 'worker';
          created_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          company_id: string;
          assigned_worker: string | null;
          customer_name: string;
          phone: string | null;
          email: string | null;
          lead_status: string | null;
          lead_source: string | null;
          tags: string[] | null;
          notes: string | null;
          platform: string | null;
          last_message: string | null;
          last_message_date: string | null;
          ad_name: string | null;
          campaign_name: string | null;
          form_name: string | null;
          education_level: string | null;
          adset_name: string | null;
          campaign_id: string | null;
          adset_id: string | null;
          ad_id: string | null;
          form_id: string | null;
          is_organic: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          assigned_worker?: string | null;
          customer_name: string;
          phone?: string | null;
          email?: string | null;
          lead_status?: string | null;
          lead_source?: string | null;
          tags?: string[] | null;
          notes?: string | null;
          platform?: string | null;
          last_message?: string | null;
          last_message_date?: string | null;
          ad_name?: string | null;
          campaign_name?: string | null;
          form_name?: string | null;
          education_level?: string | null;
          adset_name?: string | null;
          campaign_id?: string | null;
          adset_id?: string | null;
          ad_id?: string | null;
          form_id?: string | null;
          is_organic?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          assigned_worker?: string | null;
          customer_name?: string;
          phone?: string | null;
          email?: string | null;
          lead_status?: string | null;
          lead_source?: string | null;
          tags?: string[] | null;
          notes?: string | null;
          platform?: string | null;
          last_message?: string | null;
          last_message_date?: string | null;
          ad_name?: string | null;
          campaign_name?: string | null;
          form_name?: string | null;
          education_level?: string | null;
          adset_name?: string | null;
          campaign_id?: string | null;
          adset_id?: string | null;
          ad_id?: string | null;
          form_id?: string | null;
          is_organic?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          company_id: string;
          worker_id: string | null;
          customer_id: string | null;
          action: string;
          details: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          worker_id?: string | null;
          customer_id?: string | null;
          action: string;
          details?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          worker_id?: string | null;
          customer_id?: string | null;
          action?: string;
          details?: string | null;
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          company_id: string;
          assigned_worker: string | null;
          customer_id: string;
          title: string;
          description: string | null;
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          due_date: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          assigned_worker?: string | null;
          customer_id: string;
          title: string;
          description?: string | null;
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          due_date?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          assigned_worker?: string | null;
          customer_id?: string;
          title?: string;
          description?: string | null;
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          due_date?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_user_company: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
