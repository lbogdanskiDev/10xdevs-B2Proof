export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"];
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          new_data: Json | null;
          old_data: Json | null;
          user_id: string | null;
        };
        Insert: {
          action: Database["public"]["Enums"]["audit_action"];
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          new_data?: Json | null;
          old_data?: Json | null;
          user_id?: string | null;
        };
        Update: {
          action?: Database["public"]["Enums"]["audit_action"];
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          new_data?: Json | null;
          old_data?: Json | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      brief_recipients: {
        Row: {
          brief_id: string;
          id: string;
          recipient_id: string | null;
          recipient_email: string;
          shared_at: string;
          shared_by: string;
        };
        Insert: {
          brief_id: string;
          id?: string;
          recipient_id?: string | null;
          recipient_email: string;
          shared_at?: string;
          shared_by: string;
        };
        Update: {
          brief_id?: string;
          id?: string;
          recipient_id?: string | null;
          recipient_email?: string;
          shared_at?: string;
          shared_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "brief_recipients_brief_id_fkey";
            columns: ["brief_id"];
            isOneToOne: false;
            referencedRelation: "briefs";
            referencedColumns: ["id"];
          },
        ];
      };
      briefs: {
        Row: {
          comment_count: number;
          content: Json;
          created_at: string;
          footer: string | null;
          header: string;
          id: string;
          owner_id: string;
          status: Database["public"]["Enums"]["brief_status"];
          status_changed_at: string | null;
          status_changed_by: string | null;
          updated_at: string;
        };
        Insert: {
          comment_count?: number;
          content: Json;
          created_at?: string;
          footer?: string | null;
          header: string;
          id?: string;
          owner_id: string;
          status?: Database["public"]["Enums"]["brief_status"];
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          updated_at?: string;
        };
        Update: {
          comment_count?: number;
          content?: Json;
          created_at?: string;
          footer?: string | null;
          header?: string;
          id?: string;
          owner_id?: string;
          status?: Database["public"]["Enums"]["brief_status"];
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          author_id: string;
          brief_id: string;
          content: string;
          created_at: string;
          id: string;
        };
        Insert: {
          author_id: string;
          brief_id: string;
          content: string;
          created_at?: string;
          id?: string;
        };
        Update: {
          author_id?: string;
          brief_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_brief_id_fkey";
            columns: ["brief_id"];
            isOneToOne: false;
            referencedRelation: "briefs";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      user_has_brief_access: { Args: { brief_id: string }; Returns: boolean };
      get_user_by_email: {
        Args: { email_param: string };
        Returns: { id: string; email: string }[];
      };
    };
    Enums: {
      audit_action:
        | "user_registered"
        | "user_deleted"
        | "brief_created"
        | "brief_updated"
        | "brief_deleted"
        | "brief_shared"
        | "brief_unshared"
        | "brief_status_changed"
        | "comment_created"
        | "comment_deleted";
      brief_status: "draft" | "sent" | "accepted" | "rejected" | "needs_modification";
      user_role: "creator" | "client";
    };
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
      audit_action: [
        "user_registered",
        "user_deleted",
        "brief_created",
        "brief_updated",
        "brief_deleted",
        "brief_shared",
        "brief_unshared",
        "brief_status_changed",
        "comment_created",
        "comment_deleted",
      ],
      brief_status: ["draft", "sent", "accepted", "rejected", "needs_modification"],
      user_role: ["creator", "client"],
    },
  },
} as const;
