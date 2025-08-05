-- Insert sample service category
INSERT INTO public.service_categories (name, description, icon_name) VALUES 
('Massage', 'Professional massage therapy services', 'hand');

-- Insert sample service provider
INSERT INTO public.service_providers (business_name, description, address, city, state, zip_code, phone, email, is_verified, is_active) VALUES 
('Serenity Wellness Spa', 'Professional massage therapy and wellness services', '123 Wellness Ave', 'San Francisco', 'CA', '94102', '(555) 123-4567', 'info@serenitywellness.com', true, true);

-- Insert Deep Tissue Massage service
INSERT INTO public.services (name, description, price, original_price, duration_minutes, category_id, provider_id, is_available) VALUES 
('Deep Tissue Massage', 'Therapeutic deep tissue massage targeting muscle tension and knots. Perfect for stress relief and muscle recovery.', 89.99, 120.00, 60, 
(SELECT id FROM service_categories WHERE name = 'Massage'), 
(SELECT id FROM service_providers WHERE business_name = 'Serenity Wellness Spa'), 
true);

-- Insert time slots for today
INSERT INTO public.time_slots (service_id, date, start_time, end_time, is_available) VALUES 
((SELECT id FROM services WHERE name = 'Deep Tissue Massage'), CURRENT_DATE, '09:00', '10:00', true),
((SELECT id FROM services WHERE name = 'Deep Tissue Massage'), CURRENT_DATE, '10:30', '11:30', true),
((SELECT id FROM services WHERE name = 'Deep Tissue Massage'), CURRENT_DATE, '14:00', '15:00', true),
((SELECT id FROM services WHERE name = 'Deep Tissue Massage'), CURRENT_DATE, '15:30', '16:30', true),
((SELECT id FROM services WHERE name = 'Deep Tissue Massage'), CURRENT_DATE, '17:00', '18:00', true);