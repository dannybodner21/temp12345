-- Update all existing providers to share Instagram by default
UPDATE service_providers 
SET share_instagram = true 
WHERE share_instagram = false OR share_instagram IS NULL;