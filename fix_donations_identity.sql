-- One-time repair for environments where donations.donation_id is NOT NULL
-- but has no identity/default generator.

BEGIN;

-- Create sequence if it does not already exist.
CREATE SEQUENCE IF NOT EXISTS public.donations_donation_id_seq;

-- Ensure donation_id uses the sequence by default.
ALTER TABLE public.donations
  ALTER COLUMN donation_id SET DEFAULT nextval('public.donations_donation_id_seq'::regclass);

-- Align sequence with current data so next insert doesn't collide.
SELECT setval(
  'public.donations_donation_id_seq',
  COALESCE((SELECT MAX(donation_id) FROM public.donations), 0),
  true
);

COMMIT;
