-- Enable charges for test provider Stripe connections
UPDATE provider_stripe_connections 
SET 
  charges_enabled = true, 
  payouts_enabled = true,
  account_status = 'active'
WHERE stripe_account_id IN ('acct_1RmjZNEJ6fj2tNf1', 'acct_1Ro8v1E41EIs8408');