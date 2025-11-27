-- Enable realtime for profiles table
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Add profiles to realtime publication (if not already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;