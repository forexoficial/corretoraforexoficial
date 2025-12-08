-- Update handle_new_user function to generate unique document for international users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
DECLARE
  v_document TEXT;
  v_document_type TEXT;
BEGIN
  -- Get document from metadata or generate unique one for international users
  v_document := new.raw_user_meta_data->>'document';
  v_document_type := COALESCE(NULLIF(new.raw_user_meta_data->>'document_type', ''), 'international');
  
  -- If document is null, empty, or N/A, generate a unique one
  IF v_document IS NULL OR v_document = '' OR v_document = 'N/A' THEN
    v_document := 'INT-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 8);
  END IF;
  
  INSERT INTO public.profiles (user_id, full_name, document, document_type)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    v_document,
    v_document_type
  );
  RETURN new;
END;
$$;