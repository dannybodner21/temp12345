-- Create service_category_mappings table
CREATE TABLE IF NOT EXISTS public.service_category_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.service_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(service_id, category_id)
);

-- Enable RLS
ALTER TABLE public.service_category_mappings ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access on service_category_mappings" 
ON public.service_category_mappings FOR SELECT USING (true);

-- Map services to categories
INSERT INTO public.service_category_mappings (service_id, category_id)
SELECT s.id, c.id
FROM public.services s
CROSS JOIN public.service_categories c
WHERE 
    (s.name LIKE '%Massage%' AND c.name = 'Massage') OR
    (s.name LIKE '%Facial%' AND c.name = 'Facial') OR
    (s.name LIKE '%Manicure%' AND c.name = 'Manicure & Pedicure') OR
    (s.name LIKE '%Yoga%' AND c.name = 'Wellness');