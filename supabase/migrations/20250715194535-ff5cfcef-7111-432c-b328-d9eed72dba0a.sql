-- Add is_available column to synced_appointments table
ALTER TABLE public.synced_appointments 
ADD COLUMN is_available boolean NOT NULL DEFAULT true;

-- Add index for better performance when filtering available appointments
CREATE INDEX idx_synced_appointments_is_available ON public.synced_appointments(is_available);