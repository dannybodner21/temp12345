-- Add price_per_unit column to services table for unit-based pricing (e.g., Botox per unit)
ALTER TABLE public.services 
ADD COLUMN price_per_unit numeric;

-- Add a comment to explain the column
COMMENT ON COLUMN public.services.price_per_unit IS 'Price per unit for services that are sold by unit (e.g., Botox injections)';