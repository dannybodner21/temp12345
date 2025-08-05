-- Add notification and contact sharing preferences to service_providers table
ALTER TABLE public.service_providers 
ADD COLUMN notification_preference text DEFAULT 'email' CHECK (notification_preference IN ('email', 'sms', 'both')),
ADD COLUMN share_instagram boolean DEFAULT true,
ADD COLUMN share_phone boolean DEFAULT true;