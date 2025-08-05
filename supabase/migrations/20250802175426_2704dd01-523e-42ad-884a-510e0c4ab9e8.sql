-- Add latitude and longitude columns to service_providers table
ALTER TABLE public.service_providers 
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);

-- Add some sample Los Angeles coordinates for existing providers
-- You can update these with exact coordinates later
UPDATE public.service_providers 
SET 
  latitude = 34.0522 + (RANDOM() - 0.5) * 0.2,  -- Spread around LA area
  longitude = -118.2437 + (RANDOM() - 0.5) * 0.2 -- Spread around LA area
WHERE latitude IS NULL;