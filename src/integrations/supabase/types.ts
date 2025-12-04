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
      affiliate_custom_links: {
        Row: {
          affiliate_id: string
          clicks: number
          conversions: number
          created_at: string
          custom_slug: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          clicks?: number
          conversions?: number
          created_at?: string
          custom_slug: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          clicks?: number
          conversions?: number
          created_at?: string
          custom_slug?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_custom_links_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          affiliate_code: string
          commission_percentage: number
          created_at: string | null
          id: string
          is_active: boolean | null
          total_commission: number | null
          total_referrals: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          affiliate_code: string
          commission_percentage?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          total_commission?: number | null
          total_referrals?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          affiliate_code?: string
          commission_percentage?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          total_commission?: number | null
          total_referrals?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          auto_generate_candles: boolean | null
          created_at: string
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          payout_percentage: number
          symbol: string
        }
        Insert: {
          auto_generate_candles?: boolean | null
          created_at?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          payout_percentage?: number
          symbol: string
        }
        Update: {
          auto_generate_candles?: boolean | null
          created_at?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          payout_percentage?: number
          symbol?: string
        }
        Relationships: []
      }
      boosters: {
        Row: {
          created_at: string
          description: string
          description_en: string | null
          description_es: string | null
          display_order: number
          duration_minutes: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          name_en: string | null
          name_es: string | null
          payout_increase_percentage: number
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          description_en?: string | null
          description_es?: string | null
          display_order?: number
          duration_minutes: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_en?: string | null
          name_es?: string | null
          payout_increase_percentage: number
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          description_en?: string | null
          description_es?: string | null
          display_order?: number
          duration_minutes?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_en?: string | null
          name_es?: string | null
          payout_increase_percentage?: number
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      candles: {
        Row: {
          asset_id: string
          close: number
          created_at: string
          high: number
          id: string
          is_manipulated: boolean
          low: number
          manipulation_type: string | null
          open: number
          timeframe: string
          timestamp: string
          updated_at: string
          volume: number
        }
        Insert: {
          asset_id: string
          close: number
          created_at?: string
          high: number
          id?: string
          is_manipulated?: boolean
          low: number
          manipulation_type?: string | null
          open: number
          timeframe: string
          timestamp: string
          updated_at?: string
          volume?: number
        }
        Update: {
          asset_id?: string
          close?: number
          created_at?: string
          high?: number
          id?: string
          is_manipulated?: boolean
          low?: number
          manipulation_type?: string | null
          open?: number
          timeframe?: string
          timestamp?: string
          updated_at?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "candles_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_appearance_settings: {
        Row: {
          candle_border_down_color: string | null
          candle_border_down_color_dark: string | null
          candle_border_down_color_light: string | null
          candle_border_up_color: string | null
          candle_border_up_color_dark: string | null
          candle_border_up_color_light: string | null
          candle_border_visible: boolean | null
          candle_border_width: number | null
          candle_down_color: string
          candle_down_color_dark: string | null
          candle_down_color_light: string | null
          candle_up_color: string
          candle_up_color_dark: string | null
          candle_up_color_light: string | null
          chart_aspect_ratio_desktop: string | null
          chart_aspect_ratio_fullscreen: string | null
          chart_aspect_ratio_mobile: string | null
          chart_bg_color: string
          chart_bg_color_dark: string | null
          chart_bg_color_light: string | null
          chart_height_desktop: number | null
          chart_height_fullscreen: number | null
          chart_height_mobile: number | null
          chart_responsive_desktop: boolean | null
          chart_responsive_fullscreen: boolean | null
          chart_responsive_mobile: boolean | null
          chart_text_color: string
          chart_text_color_dark: string | null
          chart_text_color_light: string | null
          chart_width_percentage_desktop: number | null
          chart_width_percentage_fullscreen: number | null
          chart_width_percentage_mobile: number | null
          created_at: string
          crosshair_color: string
          crosshair_color_dark: string | null
          crosshair_color_light: string | null
          grid_horz_color: string
          grid_horz_color_dark: string | null
          grid_horz_color_light: string | null
          grid_vert_color: string
          grid_vert_color_dark: string | null
          grid_vert_color_light: string | null
          id: string
          map_enabled: boolean
          map_grid_opacity: number
          map_image_url: string | null
          map_image_url_dark: string | null
          map_opacity: number
          map_primary_color: string
          map_secondary_color: string
          map_show_grid: boolean
          price_scale_border_color: string
          price_scale_border_color_dark: string | null
          price_scale_border_color_light: string | null
          show_tradingview_logo: boolean | null
          time_scale_border_color: string
          time_scale_border_color_dark: string | null
          time_scale_border_color_light: string | null
          trade_line_call_color: string | null
          trade_line_put_color: string | null
          trade_line_show_label: boolean | null
          trade_line_style: number | null
          trade_line_width: number | null
          updated_at: string
          updated_by: string | null
          watermark_text: string | null
          watermark_visible: boolean
          wick_down_color: string | null
          wick_down_color_dark: string | null
          wick_down_color_light: string | null
          wick_up_color: string | null
          wick_up_color_dark: string | null
          wick_up_color_light: string | null
        }
        Insert: {
          candle_border_down_color?: string | null
          candle_border_down_color_dark?: string | null
          candle_border_down_color_light?: string | null
          candle_border_up_color?: string | null
          candle_border_up_color_dark?: string | null
          candle_border_up_color_light?: string | null
          candle_border_visible?: boolean | null
          candle_border_width?: number | null
          candle_down_color?: string
          candle_down_color_dark?: string | null
          candle_down_color_light?: string | null
          candle_up_color?: string
          candle_up_color_dark?: string | null
          candle_up_color_light?: string | null
          chart_aspect_ratio_desktop?: string | null
          chart_aspect_ratio_fullscreen?: string | null
          chart_aspect_ratio_mobile?: string | null
          chart_bg_color?: string
          chart_bg_color_dark?: string | null
          chart_bg_color_light?: string | null
          chart_height_desktop?: number | null
          chart_height_fullscreen?: number | null
          chart_height_mobile?: number | null
          chart_responsive_desktop?: boolean | null
          chart_responsive_fullscreen?: boolean | null
          chart_responsive_mobile?: boolean | null
          chart_text_color?: string
          chart_text_color_dark?: string | null
          chart_text_color_light?: string | null
          chart_width_percentage_desktop?: number | null
          chart_width_percentage_fullscreen?: number | null
          chart_width_percentage_mobile?: number | null
          created_at?: string
          crosshair_color?: string
          crosshair_color_dark?: string | null
          crosshair_color_light?: string | null
          grid_horz_color?: string
          grid_horz_color_dark?: string | null
          grid_horz_color_light?: string | null
          grid_vert_color?: string
          grid_vert_color_dark?: string | null
          grid_vert_color_light?: string | null
          id?: string
          map_enabled?: boolean
          map_grid_opacity?: number
          map_image_url?: string | null
          map_image_url_dark?: string | null
          map_opacity?: number
          map_primary_color?: string
          map_secondary_color?: string
          map_show_grid?: boolean
          price_scale_border_color?: string
          price_scale_border_color_dark?: string | null
          price_scale_border_color_light?: string | null
          show_tradingview_logo?: boolean | null
          time_scale_border_color?: string
          time_scale_border_color_dark?: string | null
          time_scale_border_color_light?: string | null
          trade_line_call_color?: string | null
          trade_line_put_color?: string | null
          trade_line_show_label?: boolean | null
          trade_line_style?: number | null
          trade_line_width?: number | null
          updated_at?: string
          updated_by?: string | null
          watermark_text?: string | null
          watermark_visible?: boolean
          wick_down_color?: string | null
          wick_down_color_dark?: string | null
          wick_down_color_light?: string | null
          wick_up_color?: string | null
          wick_up_color_dark?: string | null
          wick_up_color_light?: string | null
        }
        Update: {
          candle_border_down_color?: string | null
          candle_border_down_color_dark?: string | null
          candle_border_down_color_light?: string | null
          candle_border_up_color?: string | null
          candle_border_up_color_dark?: string | null
          candle_border_up_color_light?: string | null
          candle_border_visible?: boolean | null
          candle_border_width?: number | null
          candle_down_color?: string
          candle_down_color_dark?: string | null
          candle_down_color_light?: string | null
          candle_up_color?: string
          candle_up_color_dark?: string | null
          candle_up_color_light?: string | null
          chart_aspect_ratio_desktop?: string | null
          chart_aspect_ratio_fullscreen?: string | null
          chart_aspect_ratio_mobile?: string | null
          chart_bg_color?: string
          chart_bg_color_dark?: string | null
          chart_bg_color_light?: string | null
          chart_height_desktop?: number | null
          chart_height_fullscreen?: number | null
          chart_height_mobile?: number | null
          chart_responsive_desktop?: boolean | null
          chart_responsive_fullscreen?: boolean | null
          chart_responsive_mobile?: boolean | null
          chart_text_color?: string
          chart_text_color_dark?: string | null
          chart_text_color_light?: string | null
          chart_width_percentage_desktop?: number | null
          chart_width_percentage_fullscreen?: number | null
          chart_width_percentage_mobile?: number | null
          created_at?: string
          crosshair_color?: string
          crosshair_color_dark?: string | null
          crosshair_color_light?: string | null
          grid_horz_color?: string
          grid_horz_color_dark?: string | null
          grid_horz_color_light?: string | null
          grid_vert_color?: string
          grid_vert_color_dark?: string | null
          grid_vert_color_light?: string | null
          id?: string
          map_enabled?: boolean
          map_grid_opacity?: number
          map_image_url?: string | null
          map_image_url_dark?: string | null
          map_opacity?: number
          map_primary_color?: string
          map_secondary_color?: string
          map_show_grid?: boolean
          price_scale_border_color?: string
          price_scale_border_color_dark?: string | null
          price_scale_border_color_light?: string | null
          show_tradingview_logo?: boolean | null
          time_scale_border_color?: string
          time_scale_border_color_dark?: string | null
          time_scale_border_color_light?: string | null
          trade_line_call_color?: string | null
          trade_line_put_color?: string | null
          trade_line_show_label?: boolean | null
          trade_line_style?: number | null
          trade_line_width?: number | null
          updated_at?: string
          updated_by?: string | null
          watermark_text?: string | null
          watermark_visible?: boolean
          wick_down_color?: string | null
          wick_down_color_dark?: string | null
          wick_down_color_light?: string | null
          wick_up_color?: string | null
          wick_up_color_dark?: string | null
          wick_up_color_light?: string | null
        }
        Relationships: []
      }
      chart_biases: {
        Row: {
          admin_id: string
          asset_id: string
          created_at: string
          direction: string
          end_time: string
          id: string
          is_active: boolean
          name: string
          start_time: string
          strength: number
          updated_at: string
        }
        Insert: {
          admin_id: string
          asset_id: string
          created_at?: string
          direction: string
          end_time: string
          id?: string
          is_active?: boolean
          name: string
          start_time: string
          strength?: number
          updated_at?: string
        }
        Update: {
          admin_id?: string
          asset_id?: string
          created_at?: string
          direction?: string
          end_time?: string
          id?: string
          is_active?: boolean
          name?: string
          start_time?: string
          strength?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_biases_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_drawings: {
        Row: {
          asset_id: string
          color: string
          created_at: string
          drawing_type: string
          id: string
          line_style: string
          line_width: number
          points: Json
          timeframe: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id: string
          color?: string
          created_at?: string
          drawing_type: string
          id?: string
          line_style?: string
          line_width?: number
          points: Json
          timeframe: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          color?: string
          created_at?: string
          drawing_type?: string
          id?: string
          line_style?: string
          line_width?: number
          points?: Json
          timeframe?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_drawings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_manipulations: {
        Row: {
          admin_id: string
          applied_at: string
          asset_id: string
          bias_direction: string | null
          bias_strength: number | null
          candle_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          manipulated_values: Json
          manipulation_type: string
          notes: string | null
          original_values: Json
        }
        Insert: {
          admin_id: string
          applied_at?: string
          asset_id: string
          bias_direction?: string | null
          bias_strength?: number | null
          candle_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          manipulated_values: Json
          manipulation_type: string
          notes?: string | null
          original_values: Json
        }
        Update: {
          admin_id?: string
          applied_at?: string
          asset_id?: string
          bias_direction?: string | null
          bias_strength?: number | null
          candle_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          manipulated_values?: Json
          manipulation_type?: string
          notes?: string | null
          original_values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "chart_manipulations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_manipulations_candle_id_fkey"
            columns: ["candle_id"]
            isOneToOne: false
            referencedRelation: "candles"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string | null
          id: string
          referral_id: string
          transaction_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string | null
          id?: string
          referral_id: string
          transaction_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string | null
          id?: string
          referral_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      company_info: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content: string | null
          created_at: string
          description: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          description: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          description?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          api_key: string | null
          api_secret: string | null
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          type: string
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      platform_popups: {
        Row: {
          content: string
          created_at: string
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          start_date: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content: string
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          start_date?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          start_date?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance: number | null
          created_at: string
          current_asset_id: string | null
          demo_balance: number | null
          document: string
          document_type: string
          full_name: string
          id: string
          is_admin: boolean | null
          is_blocked: boolean | null
          is_demo_mode: boolean | null
          selected_assets: Json | null
          total_deposited: number | null
          updated_at: string
          user_id: string
          user_tier: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verification_submitted_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          balance?: number | null
          created_at?: string
          current_asset_id?: string | null
          demo_balance?: number | null
          document: string
          document_type: string
          full_name: string
          id?: string
          is_admin?: boolean | null
          is_blocked?: boolean | null
          is_demo_mode?: boolean | null
          selected_assets?: Json | null
          total_deposited?: number | null
          updated_at?: string
          user_id: string
          user_tier?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verification_submitted_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          balance?: number | null
          created_at?: string
          current_asset_id?: string | null
          demo_balance?: number | null
          document?: string
          document_type?: string
          full_name?: string
          id?: string
          is_admin?: boolean | null
          is_blocked?: boolean | null
          is_demo_mode?: boolean | null
          selected_assets?: Json | null
          total_deposited?: number | null
          updated_at?: string
          user_id?: string
          user_tier?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verification_submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_asset_id_fkey"
            columns: ["current_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          affiliate_id: string
          created_at: string | null
          id: string
          referred_user_id: string
          status: string
        }
        Insert: {
          affiliate_id: string
          created_at?: string | null
          id?: string
          referred_user_id: string
          status?: string
        }
        Update: {
          affiliate_id?: string
          created_at?: string | null
          id?: string
          referred_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      social_auth_providers: {
        Row: {
          client_id: string | null
          client_secret: string | null
          config: Json | null
          created_at: string
          id: string
          instructions: string | null
          is_enabled: boolean
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id?: string | null
          client_secret?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_enabled?: boolean
          provider: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string | null
          client_secret?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_enabled?: boolean
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      trades: {
        Row: {
          amount: number
          asset_id: string
          closed_at: string | null
          created_at: string
          duration_minutes: number
          entry_price: number | null
          exit_price: number | null
          expires_at: string
          id: string
          is_demo: boolean
          payout: number
          result: number | null
          status: string
          trade_type: string
          user_id: string
        }
        Insert: {
          amount: number
          asset_id: string
          closed_at?: string | null
          created_at?: string
          duration_minutes: number
          entry_price?: number | null
          exit_price?: number | null
          expires_at: string
          id?: string
          is_demo?: boolean
          payout: number
          result?: number | null
          status?: string
          trade_type: string
          user_id: string
        }
        Update: {
          amount?: number
          asset_id?: string
          closed_at?: string | null
          created_at?: string
          duration_minutes?: number
          entry_price?: number | null
          exit_price?: number | null
          expires_at?: string
          id?: string
          is_demo?: boolean
          payout?: number
          result?: number | null
          status?: string
          trade_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_method: string | null
          status: string
          transaction_reference: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          transaction_reference?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          transaction_reference?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_boosters: {
        Row: {
          activated_at: string
          booster_id: string
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          payout_increase_percentage: number
          user_id: string
        }
        Insert: {
          activated_at?: string
          booster_id: string
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          payout_increase_percentage: number
          user_id: string
        }
        Update: {
          activated_at?: string
          booster_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          payout_increase_percentage?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_boosters_booster_id_fkey"
            columns: ["booster_id"]
            isOneToOne: false
            referencedRelation: "boosters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          business_document_url: string | null
          created_at: string | null
          document_back_url: string
          document_front_url: string
          document_type: Database["public"]["Enums"]["document_type"]
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string
          status: Database["public"]["Enums"]["verification_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_document_url?: string | null
          created_at?: string | null
          document_back_url: string
          document_front_url: string
          document_type: Database["public"]["Enums"]["document_type"]
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url: string
          status?: Database["public"]["Enums"]["verification_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_document_url?: string | null
          created_at?: string | null
          document_back_url?: string
          document_front_url?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string
          status?: Database["public"]["Enums"]["verification_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_details: Json
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_details?: Json
          payment_method: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_details?: Json
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_user_tier: { Args: { deposited: number }; Returns: string }
      deactivate_expired_boosters: { Args: never; Returns: number }
      get_user_active_booster: {
        Args: { p_user_id: string }
        Returns: {
          expires_at: string
          payout_increase_percentage: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_single_expired_trade: {
        Args: { p_trade_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      document_type: "rg" | "cnh"
      entity_type: "individual" | "business"
      verification_status: "pending" | "under_review" | "approved" | "rejected"
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
      app_role: ["admin", "user"],
      document_type: ["rg", "cnh"],
      entity_type: ["individual", "business"],
      verification_status: ["pending", "under_review", "approved", "rejected"],
    },
  },
} as const
