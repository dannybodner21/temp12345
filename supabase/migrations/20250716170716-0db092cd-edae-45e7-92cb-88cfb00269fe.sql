-- Add time slots for today for the Deep Tissue Massage service
INSERT INTO public.time_slots (service_id, date, start_time, end_time, is_available) VALUES 
('1fc199d2-6b0b-4ac6-9bf5-0495e1cf3c71', CURRENT_DATE, '09:00', '10:30', true),
('1fc199d2-6b0b-4ac6-9bf5-0495e1cf3c71', CURRENT_DATE, '11:00', '12:30', true),
('1fc199d2-6b0b-4ac6-9bf5-0495e1cf3c71', CURRENT_DATE, '14:00', '15:30', true),
('1fc199d2-6b0b-4ac6-9bf5-0495e1cf3c71', CURRENT_DATE, '16:00', '17:30', true),
('1fc199d2-6b0b-4ac6-9bf5-0495e1cf3c71', CURRENT_DATE, '18:00', '19:30', true);