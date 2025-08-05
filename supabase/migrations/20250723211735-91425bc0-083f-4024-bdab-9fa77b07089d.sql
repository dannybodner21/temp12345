-- Add original_price_per_unit column to track original price per unit before discounts
ALTER TABLE public.services 
ADD COLUMN original_price_per_unit numeric;

-- Add a comment to explain the column
COMMENT ON COLUMN public.services.original_price_per_unit IS 'Original price per unit before discount was applied';