-- Drop existing triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Update handle_provider_signup to work with auto-confirmed emails
CREATE OR REPLACE FUNCTION public.handle_provider_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    provider_data JSONB;
BEGIN
    -- Check if this is a new user with provider signup data
    IF TG_OP = 'INSERT' AND NEW.raw_user_meta_data ? 'provider_signup' THEN
        provider_data := NEW.raw_user_meta_data -> 'provider_signup';
        
        -- Create the provider profile immediately (works for auto-confirmed emails)
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
            true  -- Auto-approve for pilot stage
        );
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create new trigger that fires on INSERT for immediate provider profile creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_provider_signup();