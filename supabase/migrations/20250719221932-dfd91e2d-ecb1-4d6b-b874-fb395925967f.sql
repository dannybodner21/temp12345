-- Create provider_stripe_connections table for Stripe Connect integration
CREATE TABLE public.provider_stripe_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  stripe_account_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  account_status TEXT DEFAULT 'pending',
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_id, stripe_account_id)
);

-- Enable Row Level Security
ALTER TABLE public.provider_stripe_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for providers to manage their own Stripe connections
CREATE POLICY "Providers can view their own Stripe connections" 
ON public.provider_stripe_connections 
FOR SELECT 
USING (provider_id IN (
  SELECT service_providers.id 
  FROM service_providers 
  WHERE service_providers.user_id = auth.uid()
));

CREATE POLICY "Providers can insert their own Stripe connections" 
ON public.provider_stripe_connections 
FOR INSERT 
WITH CHECK (provider_id IN (
  SELECT service_providers.id 
  FROM service_providers 
  WHERE service_providers.user_id = auth.uid()
));

CREATE POLICY "Providers can update their own Stripe connections" 
ON public.provider_stripe_connections 
FOR UPDATE 
USING (provider_id IN (
  SELECT service_providers.id 
  FROM service_providers 
  WHERE service_providers.user_id = auth.uid()
));

CREATE POLICY "Providers can delete their own Stripe connections" 
ON public.provider_stripe_connections 
FOR DELETE 
USING (provider_id IN (
  SELECT service_providers.id 
  FROM service_providers 
  WHERE service_providers.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_provider_stripe_connections_updated_at
BEFORE UPDATE ON public.provider_stripe_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();