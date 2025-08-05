-- Add address fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN address TEXT,
ADD COLUMN city TEXT,
ADD COLUMN state TEXT,
ADD COLUMN zip_code TEXT;