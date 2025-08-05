-- Update the service description to be much shorter
UPDATE public.services 
SET description = 'Therapeutic massage targeting deeper muscle layers. Perfect for tension relief and sports recovery.'
WHERE name = 'Deep Tissue Massage';

-- Create time slots for today (last-minute bookings)
INSERT INTO public.time_slots (service_id, date, start_time, end_time, is_available) VALUES
('1fc199d2-6b0b-4ac6-9bf5-0495e1cf3c71', CURRENT_DATE, '14:00:00', '15:30:00', true),
('1fc199d2-6b0b-4ac6-9bf5-0495e1cf3c71', CURRENT_DATE, '16:00:00', '17:30:00', true),
('1fc199d2-6b0b-4ac6-9bf5-0495e1cf3c71', CURRENT_DATE, '18:30:00', '20:00:00', true);