-- Add is_admin column to profiles
ALTER TABLE public.profiles ADD COLUMN is_admin boolean DEFAULT false;

-- Function to sync is_admin with user_roles
CREATE OR REPLACE FUNCTION public.sync_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin = true AND OLD.is_admin = false THEN
    -- Add admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF NEW.is_admin = false AND OLD.is_admin = true THEN
    -- Remove admin role
    DELETE FROM public.user_roles
    WHERE user_id = NEW.user_id AND role = 'admin';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to sync is_admin changes
CREATE TRIGGER sync_admin_role_trigger
AFTER UPDATE OF is_admin ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_admin_role();

-- Sync existing admin roles to is_admin field
UPDATE public.profiles
SET is_admin = true
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
);