-- Add field to control whether synced services should be offered on the platform
ALTER TABLE public.services 
ADD COLUMN offer_on_platform boolean NOT NULL DEFAULT true;

-- Add index for performance when filtering
CREATE INDEX idx_services_offer_on_platform ON public.services(offer_on_platform);

-- Add field to synced_appointments to track sync preferences at appointment level
ALTER TABLE public.synced_appointments 
ADD COLUMN offer_on_platform boolean NOT NULL DEFAULT true;