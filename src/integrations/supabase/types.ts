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
      broker_credentials: {
        Row: {
          api_key: string
          api_secret: string
          broker: Database["public"]["Enums"]["broker_type"]
          created_at: string | null
          id: string
          is_active: boolean | null
          is_testnet: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key: string
          api_secret: string
          broker: Database["public"]["Enums"]["broker_type"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_testnet?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string
          api_secret?: string
          broker?: Database["public"]["Enums"]["broker_type"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_testnet?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          average_fill_price: number | null
          broker: Database["public"]["Enums"]["broker_type"]
          broker_order_id: string | null
          created_at: string | null
          error_message: string | null
          filled_at: string | null
          filled_quantity: number | null
          id: string
          price: number | null
          quantity: number
          side: Database["public"]["Enums"]["order_side"]
          status: Database["public"]["Enums"]["order_status"] | null
          stop_price: number | null
          symbol: string
          type: Database["public"]["Enums"]["order_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_fill_price?: number | null
          broker: Database["public"]["Enums"]["broker_type"]
          broker_order_id?: string | null
          created_at?: string | null
          error_message?: string | null
          filled_at?: string | null
          filled_quantity?: number | null
          id?: string
          price?: number | null
          quantity: number
          side: Database["public"]["Enums"]["order_side"]
          status?: Database["public"]["Enums"]["order_status"] | null
          stop_price?: number | null
          symbol: string
          type: Database["public"]["Enums"]["order_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_fill_price?: number | null
          broker?: Database["public"]["Enums"]["broker_type"]
          broker_order_id?: string | null
          created_at?: string | null
          error_message?: string | null
          filled_at?: string | null
          filled_quantity?: number | null
          id?: string
          price?: number | null
          quantity?: number
          side?: Database["public"]["Enums"]["order_side"]
          status?: Database["public"]["Enums"]["order_status"] | null
          stop_price?: number | null
          symbol?: string
          type?: Database["public"]["Enums"]["order_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      portfolio_history: {
        Row: {
          broker: Database["public"]["Enums"]["broker_type"]
          cash_balance: number | null
          id: string
          positions_value: number | null
          timestamp: string | null
          total_pnl: number | null
          total_pnl_percent: number | null
          total_value: number
          user_id: string
        }
        Insert: {
          broker: Database["public"]["Enums"]["broker_type"]
          cash_balance?: number | null
          id?: string
          positions_value?: number | null
          timestamp?: string | null
          total_pnl?: number | null
          total_pnl_percent?: number | null
          total_value: number
          user_id: string
        }
        Update: {
          broker?: Database["public"]["Enums"]["broker_type"]
          cash_balance?: number | null
          id?: string
          positions_value?: number | null
          timestamp?: string | null
          total_pnl?: number | null
          total_pnl_percent?: number | null
          total_value?: number
          user_id?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          average_entry_price: number
          broker: Database["public"]["Enums"]["broker_type"]
          cost_basis: number | null
          current_price: number | null
          id: string
          market_value: number | null
          quantity: number
          symbol: string
          unrealized_pnl: number | null
          unrealized_pnl_percent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_entry_price: number
          broker: Database["public"]["Enums"]["broker_type"]
          cost_basis?: number | null
          current_price?: number | null
          id?: string
          market_value?: number | null
          quantity: number
          symbol: string
          unrealized_pnl?: number | null
          unrealized_pnl_percent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_entry_price?: number
          broker?: Database["public"]["Enums"]["broker_type"]
          cost_basis?: number | null
          current_price?: number | null
          id?: string
          market_value?: number | null
          quantity?: number
          symbol?: string
          unrealized_pnl?: number | null
          unrealized_pnl_percent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          sandbox_mode: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email: string
          id: string
          sandbox_mode?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          sandbox_mode?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          added_at: string | null
          id: string
          symbol: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          symbol: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          symbol?: string
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
      broker_type: "alpaca" | "binance" | "kite" | "sandbox"
      order_side: "buy" | "sell"
      order_status:
        | "pending"
        | "open"
        | "filled"
        | "partial"
        | "cancelled"
        | "rejected"
      order_type: "market" | "limit" | "stop" | "stop_limit"
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
      broker_type: ["alpaca", "binance", "kite", "sandbox"],
      order_side: ["buy", "sell"],
      order_status: [
        "pending",
        "open",
        "filled",
        "partial",
        "cancelled",
        "rejected",
      ],
      order_type: ["market", "limit", "stop", "stop_limit"],
    },
  },
} as const
