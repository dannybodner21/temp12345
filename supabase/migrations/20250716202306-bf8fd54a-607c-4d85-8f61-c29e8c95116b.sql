-- Update the service_providers table to default is_verified to true for pilot stage
ALTER TABLE public.service_providers ALTER COLUMN is_verified SET DEFAULT true;

-- Update existing providers to be verified
UPDATE public.service_providers SET is_verified = true WHERE is_verified = false;

-- Update the handle_provider_signup function to create verified providers
CREATE OR REPLACE FUNCTION public.handle_provider_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    provider_data JSONB;
BEGIN
    -- Only proceed if email was just confirmed (changed from null to a timestamp)
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        -- Check if user has provider signup data in raw_user_meta_data
        provider_data := NEW.raw_user_meta_data -> 'provider_signup';
        
        IF provider_data IS NOT NULL THEN
            -- Create the provider profile with verification set to true
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
    END IF;
    
    RETURN NEW;
END;
$function$;