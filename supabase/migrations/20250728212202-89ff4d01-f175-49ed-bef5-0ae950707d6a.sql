-- Update handle_provider_signup function to include accepts_text_messages
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
            accepts_text_messages,
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
            COALESCE((provider_data ->> 'accepts_text_messages')::boolean, false),
            true,
            true  -- Auto-approve for pilot stage
        );
    END IF;
    
    RETURN NEW;
END;
$function$;