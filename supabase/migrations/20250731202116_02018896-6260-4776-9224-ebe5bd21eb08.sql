-- Change the default values for new Stripe connections to be more permissive for completed onboarding
-- This doesn't affect existing records, just new ones
ALTER TABLE provider_stripe_connections 
ALTER COLUMN charges_enabled SET DEFAULT true;

ALTER TABLE provider_stripe_connections 
ALTER COLUMN payouts_enabled SET DEFAULT true;

ALTER TABLE provider_stripe_connections 
ALTER COLUMN account_status SET DEFAULT 'active';

-- Also let's sync all existing provider Stripe statuses by calling the sync function for each
-- But first, let's create a function that can be called to sync all providers automatically