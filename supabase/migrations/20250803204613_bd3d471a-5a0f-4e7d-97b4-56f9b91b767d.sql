-- Make today's time slots available again if they don't have confirmed bookings
UPDATE time_slots 
SET is_available = true 
WHERE date = CURRENT_DATE 
AND is_available = false 
AND id NOT IN (
  SELECT DISTINCT time_slot_id 
  FROM bookings 
  WHERE status IN ('confirmed', 'completed') 
  AND time_slot_id IS NOT NULL
);