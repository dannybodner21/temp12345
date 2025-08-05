-- Create table for storing scraped services data
CREATE TABLE public.scraped_services_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  source_url TEXT NOT NULL,
  raw_html TEXT,
  extracted_services JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE public.scraped_services_data 
ADD CONSTRAINT fk_scraped_services_provider 
FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.scraped_services_data ENABLE ROW LEVEL SECURITY;

-- Create policies for scraped services data
CREATE POLICY "Providers can manage their own scraped data" 
ON public.scraped_services_data 
FOR ALL 
USING (provider_id IN (
  SELECT service_providers.id
  FROM service_providers
  WHERE service_providers.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_scraped_services_data_updated_at
BEFORE UPDATE ON public.scraped_services_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_scraped_services_provider_id ON public.scraped_services_data(provider_id);
CREATE INDEX idx_scraped_services_status ON public.scraped_services_data(status);