-- Add column to track onboarding email sent
ALTER TABLE public.profiles 
ADD COLUMN onboarding_email_sent_at timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.onboarding_email_sent_at IS 'Timestamp when onboarding/password reset email was sent';