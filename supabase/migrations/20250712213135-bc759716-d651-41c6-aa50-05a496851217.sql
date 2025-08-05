-- Add unique constraint on user_id for service_providers
ALTER TABLE public.service_providers ADD CONSTRAINT service_providers_user_id_unique UNIQUE (user_id);

-- Create provider profile for the confirmed user
INSERT INTO public.service_providers (
    user_id,
    business_name,
    address,
    city,
    state,
    zip_code,
    phone,
    email,
    is_active,
    is_verified
) VALUES (
    'da9f641c-e2b3-453e-8987-14fae0888135',
    'Test Business',
    'Test Address', 
    'Test City',
    'Test State',
    '12345',
    'Test Phone',
    'jaclyntroth@gmail.com',
    true,
    false
);