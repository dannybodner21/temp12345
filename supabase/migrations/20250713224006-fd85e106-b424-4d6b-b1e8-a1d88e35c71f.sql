-- Create a generic booking platform connections table
CREATE TYPE booking_platform AS ENUM ('square', 'vagaro', 'boulevard');

CREATE TABLE public.provider_platform_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  platform booking_platform NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  platform_user_id TEXT,
  scope TEXT,
  platform_specific_data JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider_id, platform)
);

-- Enable RLS
ALTER TABLE public.provider_platform_connections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Providers can view their own platform connections" 
ON public.provider_platform_connections 
FOR SELECT 
USING (provider_id IN (
  SELECT service_providers.id
  FROM service_providers
  WHERE service_providers.user_id = auth.uid()
));

CREATE POLICY "Providers can insert their own platform connections" 
ON public.provider_platform_connections 
FOR INSERT 
WITH CHECK (provider_id IN (
  SELECT service_providers.id
  FROM service_providers
  WHERE service_providers.user_id = auth.uid()
));

CREATE POLICY "Providers can update their own platform connections" 
ON public.provider_platform_connections 
FOR UPDATE 
USING (provider_id IN (
  SELECT service_providers.id
  FROM service_providers
  WHERE service_providers.user_id = auth.uid()
));

CREATE POLICY "Providers can delete their own platform connections" 
ON public.provider_platform_connections 
FOR DELETE 
USING (provider_id IN (
  SELECT service_providers.id
  FROM service_providers
  WHERE service_providers.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_provider_platform_connections_updated_at
BEFORE UPDATE ON public.provider_platform_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();