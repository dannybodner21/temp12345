-- Enable Instagram sharing for all providers
UPDATE public.service_providers 
SET share_instagram = true 
WHERE share_instagram = false OR share_instagram IS NULL;