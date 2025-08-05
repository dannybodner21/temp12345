-- Fix the existing test service to apply the correct 7% platform fee reduction
-- WrightLooks has 27% provider discount, so customers should see 20% off (27% - 7%)
UPDATE public.services 
SET price = 40.00  -- $50 * (1 - 0.20) = $40.00 (20% customer discount)
WHERE id = '954f6daa-c29c-40e5-af7c-f92029424bc4' 
AND name = 'Test Service from Square';