ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS external_auth_provider text,
ADD COLUMN IF NOT EXISTS external_auth_subject text;

CREATE UNIQUE INDEX IF NOT EXISTS users_external_auth_identity_idx
ON public.users (external_auth_provider, external_auth_subject)
WHERE external_auth_provider IS NOT NULL
  AND external_auth_subject IS NOT NULL;
