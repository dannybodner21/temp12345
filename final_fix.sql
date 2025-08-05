-- Add zip_code too
ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);

ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Insert with zip codes
INSERT INTO public.service_providers (business_name, address, city, state, zip_code, latitude, longitude) VALUES
('Beverly Hills Spa & Wellness', '123 Rodeo Drive', 'Beverly Hills', 'CA', '90210', 34.0736, -118.4004),
('Santa Monica Beach Massage', '456 Santa Monica Blvd', 'Santa Monica', 'CA', '90401', 34.0195, -118.4912),
('Hollywood Beauty Studio', '789 Hollywood Blvd', 'Hollywood', 'CA', '90028', 34.0928, -118.3287),
('West Hollywood Nail Lounge', '321 Sunset Strip', 'West Hollywood', 'CA', '90069', 34.0900, -118.3617),
('Downtown LA Wellness Center', '555 Spring Street', 'Los Angeles', 'CA', '90013', 34.0522, -118.2437);

-- Insert services
INSERT INTO public.services (provider_id, name, price, duration_minutes, is_available)
SELECT id, 'Deep Tissue Massage', 120.00, 90, true FROM public.service_providers WHERE business_name = 'Beverly Hills Spa & Wellness'
UNION ALL
SELECT id, 'Hot Stone Massage', 140.00, 90, true FROM public.service_providers WHERE business_name = 'Santa Monica Beach Massage'
UNION ALL
SELECT id, 'Facial Treatment', 85.00, 60, true FROM public.service_providers WHERE business_name = 'Hollywood Beauty Studio'
UNION ALL
SELECT id, 'Gel Manicure', 60.00, 60, true FROM public.service_providers WHERE business_name = 'West Hollywood Nail Lounge'
UNION ALL
SELECT id, 'Yoga Session', 35.00, 60, true FROM public.service_providers WHERE business_name = 'Downtown LA Wellness Center';

-- Insert time slots
INSERT INTO public.time_slots (service_id, date, start_time, is_available)
SELECT 
    s.id,
    CURRENT_DATE as date,
    '10:00'::time,
    true
FROM public.services s;