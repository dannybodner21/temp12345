-- Create table to store synced appointments from booking platforms
CREATE TABLE public.synced_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  platform booking_platform NOT NULL,
  platform_appointment_id TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  service_name TEXT,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER,
  status TEXT DEFAULT 'confirmed',
  total_amount DECIMAL(10,2),
  notes TEXT,
  platform_specific_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider_id, platform, platform_appointment_id)
);

-- Enable Row Level Security
ALTER TABLE public.synced_appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for providers to access their synced appointments
CREATE POLICY "Providers can view their synced appointments" 
ON public.synced_appointments 
FOR SELECT 
USING (provider_id IN (
  SELECT service_providers.id
  FROM service_providers
  WHERE service_providers.user_id = auth.uid()
));

CREATE POLICY "Providers can insert their synced appointments" 
ON public.synced_appointments 
FOR INSERT 
WITH CHECK (provider_id IN (
  SELECT service_providers.id
  FROM service_providers
  WHERE service_providers.user_id = auth.uid()
));

CREATE POLICY "Providers can update their synced appointments" 
ON public.synced_appointments 
FOR UPDATE 
USING (provider_id IN (
  SELECT service_providers.id
  FROM service_providers
  WHERE service_providers.user_id = auth.uid()
));

CREATE POLICY "Providers can delete their synced appointments" 
ON public.synced_appointments 
FOR DELETE 
USING (provider_id IN (
  SELECT service_providers.id
  FROM service_providers
  WHERE service_providers.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_synced_appointments_updated_at
BEFORE UPDATE ON public.synced_appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_synced_appointments_provider_platform ON public.synced_appointments(provider_id, platform);
CREATE INDEX idx_synced_appointments_date ON public.synced_appointments(appointment_date);