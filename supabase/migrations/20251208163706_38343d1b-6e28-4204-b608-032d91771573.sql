-- Remove the existing check constraint on document_type
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_document_type_check;

-- Add a new check constraint that allows international users
ALTER TABLE public.profiles ADD CONSTRAINT profiles_document_type_check 
  CHECK (document_type IN ('cpf', 'cnpj', 'CPF', 'CNPJ', 'international', 'N/A', 'na', ''));

-- Also update the handle_new_user function to properly handle international users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, document, document_type)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(new.raw_user_meta_data->>'document', 'N/A'),
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'document_type', ''),
      'international'
    )
  );
  RETURN new;
END;
$$;