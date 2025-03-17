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
      customers: {
        Row: {
          address: string | null
          birthday: string | null
          classification: number | null
          created_at: string
          email: string | null
          id: string
          name: string
          owner_id: string | null
          phone: string | null
        }
        Insert: {
          address?: string | null
          birthday?: string | null
          classification?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          owner_id?: string | null
          phone?: string | null
        }
        Update: {
          address?: string | null
          birthday?: string | null
          classification?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      email_history: {
        Row: {
          content: string | null
          created_at: string
          id: string
          owner_id: string | null
          recipient_count: number
          status: string
          subject: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          owner_id?: string | null
          recipient_count: number
          status?: string
          subject: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          owner_id?: string | null
          recipient_count?: number
          status?: string
          subject?: string
        }
        Relationships: []
      }
      financas: {
        Row: {
          categoria: string
          created_at: string
          data_vencimento: string | null
          descricao: string
          id: string
          importante: boolean | null
          owner_id: string
          status: string
          tipo: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          data_vencimento?: string | null
          descricao: string
          id?: string
          importante?: boolean | null
          owner_id: string
          status?: string
          tipo: string
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data_vencimento?: string | null
          descricao?: string
          id?: string
          importante?: boolean | null
          owner_id?: string
          status?: string
          tipo?: string
          valor?: number
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          created_at: string
          descricao: string
          id: string
          owner_id: string
          status: string
          valor: number
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          owner_id: string
          status?: string
          valor: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          owner_id?: string
          status?: string
          valor?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string | null
          quantity: number
          supplier: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
          quantity?: number
          supplier?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          quantity?: number
          supplier?: string | null
          unit_price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          area: string
          created_at: string | null
          id: string
          name: string | null
          role: string | null
        }
        Insert: {
          area: string
          created_at?: string | null
          id: string
          name?: string | null
          role?: string | null
        }
        Update: {
          area?: string
          created_at?: string | null
          id?: string
          name?: string | null
          role?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          etapas: Json | null
          id: string
          owner_id: string | null
          titulo: string
        }
        Insert: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          etapas?: Json | null
          id?: string
          owner_id?: string | null
          titulo: string
        }
        Update: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          etapas?: Json | null
          id?: string
          owner_id?: string | null
          titulo?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          id: string
          product_id: string
          quantity: number
          sale_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          product_id: string
          quantity: number
          sale_id: string
          unit_price: number
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          sale_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          owner_id: string | null
          payment_method: string | null
          status: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          owner_id?: string | null
          payment_method?: string | null
          status?: string | null
          total_amount: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          owner_id?: string | null
          payment_method?: string | null
          status?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      SuperCrm: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          owner_id: string | null
          phone: string | null
          products: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          owner_id?: string | null
          phone?: string | null
          products?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          phone?: string | null
          products?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          owner_id: string | null
          priority: string | null
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string | null
          priority?: string | null
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string | null
          priority?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          created_at: string | null
          email: string
          id: string
          nome: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          nome: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
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
