-- Add post-appointment adjustment support to services table
ALTER TABLE public.services 
ADD COLUMN allows_post_appointment_adjustment BOOLEAN DEFAULT false;

-- Add deposit and final payment tracking to bookings table
ALTER TABLE public.bookings 
ADD COLUMN deposit_amount NUMERIC DEFAULT 50.00,
ADD COLUMN final_cost NUMERIC,
ADD COLUMN deposit_payment_intent_id TEXT,
ADD COLUMN final_payment_intent_id TEXT,
ADD COLUMN deposit_paid BOOLEAN DEFAULT false,
ADD COLUMN final_payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed'
ADD COLUMN provider_notes_internal TEXT; -- For provider to note final costs reasoning

-- Update existing services to allow post-appointment adjustment for specific types
UPDATE public.services 
SET allows_post_appointment_adjustment = true 
WHERE LOWER(name) LIKE '%botox%' 
   OR LOWER(name) LIKE '%injection%' 
   OR LOWER(name) LIKE '%filler%'
   OR LOWER(name) LIKE '%pet%'
   OR LOWER(name) LIKE '%grooming%'
   OR LOWER(description) LIKE '%botox%'
   OR LOWER(description) LIKE '%pet%';