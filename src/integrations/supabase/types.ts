export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      telegram_messages: {
        Row: {
          chat_id: number | null
          chat_name: string | null
          chat_type: string | null
          created_at: string | null
          first_name: string | null
          has_media: boolean | null
          id: number
          is_reply: boolean | null
          last_name: string | null
          message_id: number
          message_text: string | null
          reply_to_message_id: number | null
          telegram_id: number | null
          timestamp: string | null
          username: string | null
        }
        Insert: {
          chat_id?: number | null
          chat_name?: string | null
          chat_type?: string | null
          created_at?: string | null
          first_name?: string | null
          has_media?: boolean | null
          id?: number
          is_reply?: boolean | null
          last_name?: string | null
          message_id: number
          message_text?: string | null
          reply_to_message_id?: number | null
          telegram_id?: number | null
          timestamp?: string | null
          username?: string | null
        }
        Update: {
          chat_id?: number | null
          chat_name?: string | null
          chat_type?: string | null
          created_at?: string | null
          first_name?: string | null
          has_media?: boolean | null
          id?: number
          is_reply?: boolean | null
          last_name?: string | null
          message_id?: number
          message_text?: string | null
          reply_to_message_id?: number | null
          telegram_id?: number | null
          timestamp?: string | null
          username?: string | null
        }
        Relationships: []
      }
      telegram_pipedrive_mappings: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean | null
          pipedrive_person_id: number
          telegram_username: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          pipedrive_person_id: number
          telegram_username: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          pipedrive_person_id?: number
          telegram_username?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      telethon_sessions: {
        Row: {
          created_at: string | null
          id: number
          session_string: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          session_string: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          session_string?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          service: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          service: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          service?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          preferences: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          preferences?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          preferences?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string | null
          id: string
          settings: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          settings?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          settings?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
