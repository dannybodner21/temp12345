-- Add missing columns to service_providers table
ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
ADD COLUMN IF NOT EXISTS share_instagram BOOLEAN DEFAULT false;

-- Update existing providers with coordinates
UPDATE public.service_providers SET 
    latitude = 34.0736, 
    longitude = -118.4004, 
    google_maps_url = 'https://maps.google.com/?q=34.0736,-118.4004', 
    share_instagram = true 
WHERE business_name = 'Beverly Hills Spa & Wellness';

UPDATE public.service_providers SET 
    latitude = 34.0195, 
    longitude = -118.4912, 
    google_maps_url = 'https://maps.google.com/?q=34.0195,-118.4912', 
    share_instagram = true 
WHERE business_name = 'Santa Monica Beach Massage';

UPDATE public.service_providers SET 
    latitude = 34.0928, 
    longitude = -118.3287, 
    google_maps_url = 'https://maps.google.com/?q=34.0928,-118.3287', 
    share_instagram = false 
WHERE business_name = 'Hollywood Beauty Studio';

UPDATE public.service_providers SET 
    latitude = 34.0900, 
    longitude = -118.3617, 
    google_maps_url = 'https://maps.google.com/?q=34.0900,-118.3617', 
    share_instagram = true 
WHERE business_name = 'West Hollywood Nail Lounge';

UPDATE public.service_providers SET 
    latitude = 34.0522, 
    longitude = -118.2437, 
    google_maps_url = 'https://maps.google.com/?q=34.0522,-118.2437', 
    share_instagram = false 
WHERE business_name = 'Downtown LA Wellness Center';