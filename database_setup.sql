-- Create all tables and test data for the map

-- Create service_providers table
CREATE TABLE IF NOT EXISTS public.service_providers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_name TEXT NOT NULL,
    city TEXT,
    state TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create services table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create time_slots table
CREATE TABLE IF NOT EXISTS public.time_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create service_categories table
CREATE TABLE IF NOT EXISTS public.service_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access on service_providers" ON public.service_providers FOR SELECT USING (true);
CREATE POLICY "Allow public read access on services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Allow public read access on time_slots" ON public.time_slots FOR SELECT USING (true);
CREATE POLICY "Allow public read access on service_categories" ON public.service_categories FOR SELECT USING (true);

-- Insert service categories
INSERT INTO public.service_categories (name, description, icon_name) VALUES
('Massage', 'Relaxing massage services', 'Hand'),
('Facial', 'Skincare and facial treatments', 'Sparkles'),
('Manicure & Pedicure', 'Nail care services', 'Palette'),
('Hair', 'Hair styling and treatments', 'Scissors'),
('Wellness', 'Yoga, meditation, and wellness', 'Heart'),
('Beauty', 'Makeup and beauty services', 'Star')
ON CONFLICT DO NOTHING;

-- Insert 5 LA test providers
INSERT INTO public.service_providers (business_name, city, state, latitude, longitude) VALUES
('Beverly Hills Spa & Wellness', 'Beverly Hills', 'CA', 34.0736, -118.4004),
('Santa Monica Beach Massage', 'Santa Monica', 'CA', 34.0195, -118.4912),
('Hollywood Beauty Studio', 'Hollywood', 'CA', 34.0928, -118.3287),
('West Hollywood Nail Lounge', 'West Hollywood', 'CA', 34.0900, -118.3617),
('Downtown LA Wellness Center', 'Los Angeles', 'CA', 34.0522, -118.2437)
ON CONFLICT DO NOTHING;

-- Insert services for each provider
INSERT INTO public.services (provider_id, name, price, duration_minutes, is_available)
SELECT id, 'Deep Tissue Massage', 120.00, 90, true FROM public.service_providers WHERE business_name = 'Beverly Hills Spa & Wellness'
UNION ALL
SELECT id, 'Swedish Massage', 95.00, 60, true FROM public.service_providers WHERE business_name = 'Beverly Hills Spa & Wellness'
UNION ALL
SELECT id, 'Hot Stone Massage', 140.00, 90, true FROM public.service_providers WHERE business_name = 'Santa Monica Beach Massage'
UNION ALL
SELECT id, 'Relaxation Massage', 85.00, 60, true FROM public.service_providers WHERE business_name = 'Santa Monica Beach Massage'
UNION ALL
SELECT id, 'Facial Treatment', 85.00, 60, true FROM public.service_providers WHERE business_name = 'Hollywood Beauty Studio'
UNION ALL
SELECT id, 'Hair Cut & Style', 75.00, 60, true FROM public.service_providers WHERE business_name = 'Hollywood Beauty Studio'
UNION ALL
SELECT id, 'Gel Manicure', 60.00, 60, true FROM public.service_providers WHERE business_name = 'West Hollywood Nail Lounge'
UNION ALL
SELECT id, 'Pedicure', 55.00, 60, true FROM public.service_providers WHERE business_name = 'West Hollywood Nail Lounge'
UNION ALL
SELECT id, 'Yoga Session', 35.00, 60, true FROM public.service_providers WHERE business_name = 'Downtown LA Wellness Center'
UNION ALL
SELECT id, 'Meditation Class', 25.00, 45, true FROM public.service_providers WHERE business_name = 'Downtown LA Wellness Center';

-- Insert time slots for today and tomorrow
INSERT INTO public.time_slots (service_id, date, start_time, is_available)
SELECT 
    s.id,
    CURRENT_DATE as date,
    time_slot,
    true
FROM public.services s
CROSS JOIN (
    VALUES 
        ('09:00'::time),
        ('10:30'::time),
        ('12:00'::time),
        ('13:30'::time),
        ('15:00'::time),
        ('16:30'::time),
        ('18:00'::time)
) AS time_slots(time_slot)

UNION ALL

SELECT 
    s.id,
    CURRENT_DATE + interval '1 days' as date,
    time_slot,
    true
FROM public.services s
CROSS JOIN (
    VALUES 
        ('09:00'::time),
        ('10:30'::time),
        ('12:00'::time),
        ('13:30'::time),
        ('15:00'::time),
        ('16:30'::time),
        ('18:00'::time)
) AS time_slots(time_slot);