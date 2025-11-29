-- Add translation columns to boosters table
ALTER TABLE public.boosters 
ADD COLUMN IF NOT EXISTS name_en TEXT,
ADD COLUMN IF NOT EXISTS name_es TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_es TEXT;

-- Update existing boosters with Portuguese as default (name/description are currently in Portuguese)
-- The existing name and description columns will remain as Portuguese (pt)
UPDATE public.boosters
SET 
  name_en = name,  -- Admin will need to update these later
  name_es = name,
  description_en = description,
  description_es = description
WHERE name_en IS NULL;

-- Add comment to clarify the default language columns
COMMENT ON COLUMN public.boosters.name IS 'Booster name in Portuguese (default)';
COMMENT ON COLUMN public.boosters.description IS 'Booster description in Portuguese (default)';
COMMENT ON COLUMN public.boosters.name_en IS 'Booster name in English';
COMMENT ON COLUMN public.boosters.name_es IS 'Booster name in Spanish';
COMMENT ON COLUMN public.boosters.description_en IS 'Booster description in English';
COMMENT ON COLUMN public.boosters.description_es IS 'Booster description in Spanish';