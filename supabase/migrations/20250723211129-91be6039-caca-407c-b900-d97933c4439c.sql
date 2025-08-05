-- Make price column nullable since providers can use either price or price_per_unit
ALTER TABLE public.services 
ALTER COLUMN price DROP NOT NULL;