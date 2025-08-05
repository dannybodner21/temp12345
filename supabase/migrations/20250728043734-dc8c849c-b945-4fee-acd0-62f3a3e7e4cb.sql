-- Add accepts_text_messages column to service_providers table
ALTER TABLE public.service_providers 
ADD COLUMN accepts_text_messages BOOLEAN NOT NULL DEFAULT false;