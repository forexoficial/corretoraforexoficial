-- Update handle_new_user function to save country information
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_document TEXT;
  v_document_type TEXT;
  v_country_code TEXT;
  v_country_name TEXT;
  v_preferred_currency TEXT;
BEGIN
  -- Get document from metadata or generate unique one for international users
  v_document := new.raw_user_meta_data->>'document';
  v_document_type := COALESCE(NULLIF(new.raw_user_meta_data->>'document_type', ''), 'international');
  
  -- Get country information from metadata
  v_country_code := COALESCE(NULLIF(new.raw_user_meta_data->>'country_code', ''), 'XX');
  v_country_name := COALESCE(NULLIF(new.raw_user_meta_data->>'country_name', ''), 'Unknown');
  v_preferred_currency := COALESCE(NULLIF(new.raw_user_meta_data->>'preferred_currency', ''), 'USD');
  
  -- If document is null, empty, or N/A, generate a unique one
  IF v_document IS NULL OR v_document = '' OR v_document = 'N/A' THEN
    v_document := 'INT-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 8);
  END IF;
  
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    document, 
    document_type,
    country_code,
    country_name,
    preferred_currency
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    v_document,
    v_document_type,
    v_country_code,
    v_country_name,
    v_preferred_currency
  );
  RETURN new;
END;
$$;