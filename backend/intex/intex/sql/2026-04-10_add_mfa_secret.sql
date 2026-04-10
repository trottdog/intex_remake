ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS mfa_secret text;
