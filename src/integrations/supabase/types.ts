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
      game_members: {
        Row: {
          cash: number
          game_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          cash?: number
          game_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          cash?: number
          game_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_members_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          allow_short: boolean
          commission: number
          created_at: string
          created_by: string
          duration_days: number | null
          ends_at: string | null
          id: string
          is_public: boolean
          join_code: string
          leverage: number
          name: string
          starting_cash: number
        }
        Insert: {
          allow_short?: boolean
          commission?: number
          created_at?: string
          created_by: string
          duration_days?: number | null
          ends_at?: string | null
          id?: string
          is_public?: boolean
          join_code?: string
          leverage?: number
          name: string
          starting_cash?: number
        }
        Update: {
          allow_short?: boolean
          commission?: number
          created_at?: string
          created_by?: string
          duration_days?: number | null
          ends_at?: string | null
          id?: string
          is_public?: boolean
          join_code?: string
          leverage?: number
          name?: string
          starting_cash?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          after_hours: boolean
          created_at: string
          filled_at: string | null
          filled_price: number | null
          id: string
          limit_price: number | null
          member_id: string
          order_type: Database["public"]["Enums"]["order_type"]
          shares: number
          side: Database["public"]["Enums"]["order_side"]
          status: Database["public"]["Enums"]["order_status"]
          stop_price: number | null
          symbol: string
        }
        Insert: {
          after_hours?: boolean
          created_at?: string
          filled_at?: string | null
          filled_price?: number | null
          id?: string
          limit_price?: number | null
          member_id: string
          order_type?: Database["public"]["Enums"]["order_type"]
          shares: number
          side: Database["public"]["Enums"]["order_side"]
          status?: Database["public"]["Enums"]["order_status"]
          stop_price?: number | null
          symbol: string
        }
        Update: {
          after_hours?: boolean
          created_at?: string
          filled_at?: string | null
          filled_price?: number | null
          id?: string
          limit_price?: number | null
          member_id?: string
          order_type?: Database["public"]["Enums"]["order_type"]
          shares?: number
          side?: Database["public"]["Enums"]["order_side"]
          status?: Database["public"]["Enums"]["order_status"]
          stop_price?: number | null
          symbol?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "game_members"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          avg_cost: number
          id: string
          member_id: string
          shares: number
          symbol: string
          updated_at: string
        }
        Insert: {
          avg_cost?: number
          id?: string
          member_id: string
          shares?: number
          symbol: string
          updated_at?: string
        }
        Update: {
          avg_cost?: number
          id?: string
          member_id?: string
          shares?: number
          symbol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "game_members"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          commission: number
          created_at: string
          id: string
          member_id: string
          order_id: string | null
          price: number
          shares: number
          side: Database["public"]["Enums"]["order_side"]
          symbol: string
        }
        Insert: {
          commission?: number
          created_at?: string
          id?: string
          member_id: string
          order_id?: string | null
          price: number
          shares: number
          side: Database["public"]["Enums"]["order_side"]
          symbol: string
        }
        Update: {
          commission?: number
          created_at?: string
          id?: string
          member_id?: string
          order_id?: string | null
          price?: number
          shares?: number
          side?: Database["public"]["Enums"]["order_side"]
          symbol?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "game_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_game_member: { Args: { _game_id: string }; Returns: boolean }
      join_game_by_code: {
        Args: { _code: string }
        Returns: {
          id: string
          join_code: string
          starting_cash: number
        }[]
      }
      member_in_my_game: { Args: { _member_id: string }; Returns: boolean }
      owns_member: { Args: { _member_id: string }; Returns: boolean }
    }
    Enums: {
      order_side: "buy" | "sell"
      order_status: "pending" | "filled" | "cancelled"
      order_type: "market" | "limit" | "stop"
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
      order_side: ["buy", "sell"],
      order_status: ["pending", "filled", "cancelled"],
      order_type: ["market", "limit", "stop"],
    },
  },
} as const
