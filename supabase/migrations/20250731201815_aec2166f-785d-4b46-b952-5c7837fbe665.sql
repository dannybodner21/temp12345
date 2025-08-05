-- Enable charges and payouts for all provider Stripe connections
UPDATE provider_stripe_connections 
SET 
  charges_enabled = true, 
  payouts_enabled = true,
  account_status = 'active'
WHERE stripe_account_id IS NOT NULL;

-- Also create Stripe connections for providers that don't have them yet
-- This is a temporary solution for testing - in production, providers would need to complete actual Stripe onboarding
INSERT INTO provider_stripe_connections (provider_id, stripe_account_id, charges_enabled, payouts_enabled, account_status)
SELECT 
  sp.id,
  'acct_test_' || substring(sp.id::text, 1, 8), -- Generate test account IDs
  true,
  true,
  'active'
FROM service_providers sp
WHERE sp.id NOT IN (
  SELECT provider_id 
  FROM provider_stripe_connections 
  WHERE provider_id IS NOT NULL
);