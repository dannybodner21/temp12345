-- Fix Absolute Skin Therapy Stripe account ID
UPDATE provider_stripe_connections 
SET 
  stripe_account_id = 'acct_1RpESoED4V8Z7h9u',
  account_status = 'complete',
  charges_enabled = true,
  payouts_enabled = true,
  updated_at = now()
WHERE provider_id = 'f239ba50-4b3b-405c-9815-09326b554682';

-- Fix all other real provider Stripe account IDs
UPDATE provider_stripe_connections 
SET 
  stripe_account_id = 'acct_1RpBykCiEXNMxw9o',
  account_status = 'complete',
  charges_enabled = true,
  payouts_enabled = true,
  updated_at = now()
WHERE provider_id = '67878718-0870-47e0-9aa4-31450bd78928';

UPDATE provider_stripe_connections 
SET 
  stripe_account_id = 'acct_1Ro8wHCfTmoONf4a',
  account_status = 'complete',
  charges_enabled = true,
  payouts_enabled = true,
  updated_at = now()
WHERE provider_id = '3ebc9fa6-bb62-4c02-9f8e-87eb53a7efa6';

UPDATE provider_stripe_connections 
SET 
  stripe_account_id = 'acct_1RqiF7CoYB7gL1Oi',
  account_status = 'complete',
  charges_enabled = true,
  payouts_enabled = true,
  updated_at = now()
WHERE provider_id = '4d37f5b8-6fd8-47ec-94b4-4bad039e8867';

UPDATE provider_stripe_connections 
SET 
  stripe_account_id = 'acct_1RqhsDCWUWyjb1xA',
  account_status = 'complete',
  charges_enabled = true,
  payouts_enabled = true,
  updated_at = now()
WHERE provider_id = '8eb22cdc-484f-4743-8c60-d2d9c54b7565';

UPDATE provider_stripe_connections 
SET 
  stripe_account_id = 'acct_1RoAuFE98jnMqvK2',
  account_status = 'complete',
  charges_enabled = true,
  payouts_enabled = true,
  updated_at = now()
WHERE provider_id = '2761519a-ec8d-4ed5-a27f-06bacfb31092';

UPDATE provider_stripe_connections 
SET 
  stripe_account_id = 'acct_1RoY5iE17pCDbhfZ',
  account_status = 'complete',
  charges_enabled = true,
  payouts_enabled = true,
  updated_at = now()
WHERE provider_id = '9156c5bf-3368-4adc-a126-b888148755fe';

UPDATE provider_stripe_connections 
SET 
  stripe_account_id = 'acct_1RpFUdCXiyGGZa8H',
  account_status = 'complete',
  charges_enabled = true,
  payouts_enabled = true,
  updated_at = now()
WHERE provider_id = 'c428b808-afb1-419c-8456-ceb3ffd68ed3';

UPDATE provider_stripe_connections 
SET 
  stripe_account_id = 'acct_1RqIM2Cg7GUhCDXE',
  account_status = 'complete',
  charges_enabled = true,
  payouts_enabled = true,
  updated_at = now()
WHERE provider_id = '2debf851-887e-4ee9-87ef-7c2a44f1cc56';