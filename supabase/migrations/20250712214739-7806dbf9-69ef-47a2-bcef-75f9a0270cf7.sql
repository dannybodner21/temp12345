-- Update all existing providers to be verified for the pilot phase
UPDATE public.service_providers 
SET is_verified = true 
WHERE is_verified = false;