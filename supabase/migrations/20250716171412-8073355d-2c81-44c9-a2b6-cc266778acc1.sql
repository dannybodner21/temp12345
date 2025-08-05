-- Add columns to services table to track platform-synced services
ALTER TABLE public.services 
ADD COLUMN sync_source TEXT,
ADD COLUMN platform_service_id TEXT,
ADD COLUMN sync_metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for faster querying of synced services
CREATE INDEX idx_services_sync_source ON public.services(sync_source);
CREATE INDEX idx_services_platform_service_id ON public.services(platform_service_id);

-- Add columns to time_slots to track platform sync
ALTER TABLE public.time_slots
ADD COLUMN sync_source TEXT,
ADD COLUMN platform_appointment_id TEXT,
ADD COLUMN sync_metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for faster querying of synced time slots
CREATE INDEX idx_time_slots_sync_source ON public.time_slots(sync_source);
CREATE INDEX idx_time_slots_platform_appointment_id ON public.time_slots(platform_appointment_id);