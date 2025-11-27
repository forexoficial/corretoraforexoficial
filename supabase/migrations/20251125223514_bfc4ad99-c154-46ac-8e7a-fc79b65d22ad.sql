-- Add fields to profiles table to persist user platform state
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS selected_assets jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS current_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL;