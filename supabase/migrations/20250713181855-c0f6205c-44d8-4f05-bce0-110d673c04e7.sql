-- Create table to store Square OAuth connections for providers
CREATE TABLE public.provider_square_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  square_application_id TEXT NOT NULL,
  square_merchant_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider_id)
);

-- Enable Row Level Security
ALTER TABLE public.provider_square_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for provider access to their own Square connections
CREATE POLICY "Providers can view their own Square connections" 
ON public.provider_square_connections 
FOR SELECT 
USING (provider_id IN (
  SELECT id FROM service_providers WHERE user_id = auth.uid()
));

CREATE POLICY "Providers can insert their own Square connections" 
ON public.provider_square_connections 
FOR INSERT 
WITH CHECK (provider_id IN (
  SELECT id FROM service_providers WHERE user_id = auth.uid()
));

CREATE POLICY "Providers can update their own Square connections" 
ON public.provider_square_connections 
FOR UPDATE 
USING (provider_id IN (
  SELECT id FROM service_providers WHERE user_id = auth.uid()
));

CREATE POLICY "Providers can delete their own Square connections" 
ON public.provider_square_connections 
FOR DELETE 
USING (provider_id IN (
  SELECT id FROM service_providers WHERE user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_provider_square_connections_updated_at
BEFORE UPDATE ON public.provider_square_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();