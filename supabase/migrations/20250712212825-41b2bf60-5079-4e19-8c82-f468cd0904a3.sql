-- Create a function to handle provider profile creation after email confirmation
CREATE OR REPLACE FUNCTION public.handle_provider_signup()
RETURNS TRIGGER AS $$
DECLARE
    provider_data JSONB;
BEGIN
    -- Only proceed if email was just confirmed (changed from null to a timestamp)
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        -- Check if user has provider signup data in raw_user_meta_data
        provider_data := NEW.raw_user_meta_data -> 'provider_signup';
        
        IF provider_data IS NOT NULL THEN
            -- Create the provider profile
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
                NEW.id,
                provider_data ->> 'business_name',
                provider_data ->> 'address',
                provider_data ->> 'city',
                provider_data ->> 'state',
                provider_data ->> 'zip_code',
                provider_data ->> 'phone',
                NEW.email,
                true,
                true
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create provider profiles after email confirmation
CREATE TRIGGER on_auth_user_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_provider_signup();