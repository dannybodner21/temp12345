-- Fix the Beauty & Wellness IV Therapy time slots that were incorrectly saved as yesterday
-- Update them to today's date (2025-07-24)
UPDATE time_slots 
SET date = '2025-07-24'
WHERE service_id = 'a2535865-03be-4784-9711-8ed23e3575ee'
  AND date = '2025-07-23';

-- Also ensure any future time slot creation uses the correct timezone
-- This is more of a note - the actual fix should be in the application code to handle timezones properly