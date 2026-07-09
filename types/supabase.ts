export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Project {
  id: number;
  name: string;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface GoogleSheet {
  id: number;
  name: string;
  spreadsheet_id: string;
  sheet_name: string;
  column_mapping: Json | null;
  is_active: boolean | null;
  last_synced_at: string | null;
  sync_interval_minutes: number | null;
  created_at: string | null;
  updated_at: string | null;
  project_id: number | null;
}

export interface SheetLead {
  id: number;
  sheet_id: number | null;
  row_number: number | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string | null;
  raw_data: Json | null;
  notes: string | null;
  notified: boolean | null;
  notified_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface NotificationSetting {
  id: number;
  sheet_id: number | null;
  name: string | null;
  channel: string | null;
  is_active: boolean | null;
  recipient_emails: Json | null;
  email_subject_template: string | null;
  email_body_template: string | null;
  webhook_url: string | null;
  webhook_headers: Json | null;
  trigger_on_new_lead: boolean | null;
  trigger_on_status_change: boolean | null;
  filter_conditions: Json | null;
  created_at: string | null;
  updated_at: string | null;
  whatsapp_number: string | null;
}

export interface NotificationLog {
  id: number;
  setting_id: number | null;
  lead_id: number | null;
  channel: string | null;
  status: string | null;
  message: string | null;
  error_detail: string | null;
  sent_at: string | null;
}

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: Project;
        Insert: Omit<Project, "id" | "created_at" | "updated_at"> & {
          id?: number;
          created_at?: Project["created_at"];
          updated_at?: Project["updated_at"];
        };
        Update: Partial<Project> & { id?: number };
        Relationships: [];
      };
      google_sheets: {
        Row: GoogleSheet;
        Insert: Omit<GoogleSheet, "id" | "created_at" | "updated_at"> & {
          id?: number;
          created_at?: GoogleSheet["created_at"];
          updated_at?: GoogleSheet["updated_at"];
        };
        Update: Partial<GoogleSheet> & { id?: number };
        Relationships: [];
      };
      sheet_leads: {
        Row: SheetLead;
        Insert: Omit<SheetLead, "id" | "created_at" | "updated_at"> & {
          id?: number;
          created_at?: SheetLead["created_at"];
          updated_at?: SheetLead["updated_at"];
        };
        Update: Partial<SheetLead> & { id?: number };
        Relationships: [];
      };
      notification_settings: {
        Row: NotificationSetting;
        Insert: Omit<NotificationSetting, "id" | "created_at" | "updated_at"> & {
          id?: number;
          created_at?: NotificationSetting["created_at"];
          updated_at?: NotificationSetting["updated_at"];
        };
        Update: Partial<NotificationSetting> & { id?: number };
        Relationships: [];
      };
      notification_logs: {
        Row: NotificationLog;
        Insert: Omit<NotificationLog, "id"> & { id?: number };
        Update: Partial<NotificationLog> & { id?: number };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

