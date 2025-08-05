-- Add open_days column to service_providers table
ALTER TABLE public.service_providers 
ADD COLUMN open_days TEXT[];