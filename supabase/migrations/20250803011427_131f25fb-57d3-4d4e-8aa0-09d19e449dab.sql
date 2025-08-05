-- Add unique constraint on provider_id if it doesn't exist
ALTER TABLE public.provider_stripe_connections 
ADD CONSTRAINT provider_stripe_connections_provider_id_key UNIQUE (provider_id);

-- Add Stripe account connections for Giffen Aesthetics and WrightLooks
INSERT INTO public.provider_stripe_connections (
  provider_id,
  stripe_account_id,
  account_status,
  charges_enabled,
  payouts_enabled,
  is_active,
  created_at,
  updated_at
) VALUES 
  (
    '10887d90-4e05-406a-9713-5cb516deba4f', -- Giffen Aesthetics
    'acct_1RrOhEEC4zwMTBio',
    'complete',
    true,
    true,
    true,
    now(),
    now()
  ),
  (
    '8266286d-0ed1-4a85-a857-13ce31e527b3', -- WrightLooks  
    'acct_1RrNKxE3C0ZYO9uM',
    'complete',
    true,
    true,
    true,
    now(),
    now()
  )
ON CONFLICT (provider_id) DO UPDATE SET
  stripe_account_id = EXCLUDED.stripe_account_id,
  account_status = EXCLUDED.account_status,
  charges_enabled = EXCLUDED.charges_enabled,
  payouts_enabled = EXCLUDED.payouts_enabled,
  is_active = EXCLUDED.is_active,
  updated_at = now();