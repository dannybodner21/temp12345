-- Add Google Maps URL field to service providers
ALTER TABLE public.service_providers 
ADD COLUMN google_maps_url TEXT;