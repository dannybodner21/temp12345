-- Create service categories table
CREATE TABLE public.service_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT, -- for storing lucide icon names
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service providers table
CREATE TABLE public.service_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  website_url TEXT,
  instagram_handle TEXT,
  profile_image_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2), -- for showing discounts
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  max_bookings_per_day INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create time slots table for availability
CREATE TABLE public.time_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_id, date, start_time)
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  time_slot_id UUID REFERENCES public.time_slots(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  total_price DECIMAL(10,2) NOT NULL,
  customer_notes TEXT,
  provider_notes TEXT,
  booking_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user profiles table for additional user info
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public browsing and authenticated booking

-- Service categories - public read access
CREATE POLICY "Categories are viewable by everyone" 
ON public.service_categories 
FOR SELECT 
USING (true);

-- Service categories - only admins can modify (for now)
CREATE POLICY "Only authenticated users can insert categories" 
ON public.service_categories 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Service providers - public read access for active providers
CREATE POLICY "Active providers are viewable by everyone" 
ON public.service_providers 
FOR SELECT 
USING (is_active = true);

-- Service providers - providers can manage their own profile
CREATE POLICY "Providers can manage their own profile" 
ON public.service_providers 
FOR ALL 
USING (auth.uid() = user_id);

-- Services - public read access for available services
CREATE POLICY "Available services are viewable by everyone" 
ON public.services 
FOR SELECT 
USING (is_available = true);

-- Services - providers can manage their own services
CREATE POLICY "Providers can manage their own services" 
ON public.services 
FOR ALL 
USING (
  provider_id IN (
    SELECT id FROM public.service_providers WHERE user_id = auth.uid()
  )
);

-- Time slots - public read access for available slots
CREATE POLICY "Available time slots are viewable by everyone" 
ON public.time_slots 
FOR SELECT 
USING (is_available = true);

-- Time slots - providers can manage their own time slots
CREATE POLICY "Providers can manage their own time slots" 
ON public.time_slots 
FOR ALL 
USING (
  service_id IN (
    SELECT s.id FROM public.services s
    JOIN public.service_providers sp ON s.provider_id = sp.id
    WHERE sp.user_id = auth.uid()
  )
);

-- Bookings - users can view their own bookings
CREATE POLICY "Users can view their own bookings" 
ON public.bookings 
FOR SELECT 
USING (auth.uid() = user_id);

-- Bookings - users can create their own bookings
CREATE POLICY "Users can create their own bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Bookings - users can update their own bookings (for cancellation)
CREATE POLICY "Users can update their own bookings" 
ON public.bookings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Bookings - providers can view bookings for their services
CREATE POLICY "Providers can view bookings for their services" 
ON public.bookings 
FOR SELECT 
USING (
  service_id IN (
    SELECT s.id FROM public.services s
    JOIN public.service_providers sp ON s.provider_id = sp.id
    WHERE sp.user_id = auth.uid()
  )
);

-- Bookings - providers can update bookings for their services
CREATE POLICY "Providers can update bookings for their services" 
ON public.bookings 
FOR UPDATE 
USING (
  service_id IN (
    SELECT s.id FROM public.services s
    JOIN public.service_providers sp ON s.provider_id = sp.id
    WHERE sp.user_id = auth.uid()
  )
);

-- Profiles - users can view and manage their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_service_categories_updated_at
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_providers_updated_at
  BEFORE UPDATE ON public.service_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_slots_updated_at
  BEFORE UPDATE ON public.time_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample service categories
INSERT INTO public.service_categories (name, description, icon_name) VALUES
('Massage', 'Relaxing massage services', 'Hand'),
('Facial', 'Skincare and facial treatments', 'Sparkles'),
('Manicure & Pedicure', 'Nail care services', 'Palette'),
('Hair', 'Hair styling and treatments', 'Scissors'),
('Wellness', 'Yoga, meditation, and wellness', 'Heart'),
('Beauty', 'Makeup and beauty services', 'Star');