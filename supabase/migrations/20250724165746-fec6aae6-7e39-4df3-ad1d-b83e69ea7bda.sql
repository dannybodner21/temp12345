-- Add default discount strategy and service approval toggle to service_providers table
ALTER TABLE public.service_providers 
ADD COLUMN default_discount_percentage numeric DEFAULT 0,
ADD COLUMN requires_service_approval boolean DEFAULT true;

-- Update existing providers to have a default 10% discount and require approval
UPDATE public.service_providers 
SET default_discount_percentage = 10, requires_service_approval = true 
WHERE default_discount_percentage IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.service_providers.default_discount_percentage IS 'Default discount percentage applied to all services for this provider';
COMMENT ON COLUMN public.service_providers.requires_service_approval IS 'Whether provider needs to approve services before they go live';