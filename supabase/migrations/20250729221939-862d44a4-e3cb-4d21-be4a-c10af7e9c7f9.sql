-- Create junction table for many-to-many relationship between services and categories
CREATE TABLE public.service_category_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL,
  category_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_id, category_id)
);

-- Enable Row Level Security
ALTER TABLE public.service_category_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies for service category mappings
CREATE POLICY "Available service categories are viewable by everyone" 
ON public.service_category_mappings 
FOR SELECT 
USING (
  service_id IN (
    SELECT id FROM public.services WHERE is_available = true
  )
);

CREATE POLICY "Providers can manage their own service categories" 
ON public.service_category_mappings 
FOR ALL 
USING (
  service_id IN (
    SELECT s.id 
    FROM public.services s
    JOIN public.service_providers sp ON s.provider_id = sp.id
    WHERE sp.user_id = auth.uid()
  )
)
WITH CHECK (
  service_id IN (
    SELECT s.id 
    FROM public.services s
    JOIN public.service_providers sp ON s.provider_id = sp.id
    WHERE sp.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all service categories" 
ON public.service_category_mappings 
FOR ALL 
USING (is_admin_user())
WITH CHECK (is_admin_user());

-- Migrate existing data from services.category_id to the new junction table
INSERT INTO public.service_category_mappings (service_id, category_id)
SELECT id, category_id 
FROM public.services 
WHERE category_id IS NOT NULL;

-- Create indexes for better performance
CREATE INDEX idx_service_category_mappings_service_id ON public.service_category_mappings(service_id);
CREATE INDEX idx_service_category_mappings_category_id ON public.service_category_mappings(category_id);

-- We'll keep the category_id column in services for now to avoid breaking existing code
-- It can be removed in a future migration once all code is updated