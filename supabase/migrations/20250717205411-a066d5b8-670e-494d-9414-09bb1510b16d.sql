-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to refresh tokens every 7 days at 2 AM UTC
SELECT cron.schedule(
  'refresh-provider-tokens',
  '0 2 */7 * *', -- Every 7 days at 2 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://hoealuscfuqrmpzyambj.supabase.co/functions/v1/refresh-tokens',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZWFsdXNjZnVxcm1wenlhbWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNzQzNTksImV4cCI6MjA2Nzg1MDM1OX0.d2gmMD5_hyyS28bRPXU3Tr6cXnkTDt7tcHkSH7Yo8UE"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Create a function to manually trigger token refresh if needed
CREATE OR REPLACE FUNCTION public.trigger_token_refresh()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT net.http_post(
    url := 'https://hoealuscfuqrmpzyambj.supabase.co/functions/v1/refresh-tokens',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZWFsdXNjZnVxcm1wenlhbWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNzQzNTksImV4cCI6MjA2Nzg1MDM1OX0.d2gmMD5_hyyS28bRPXU3Tr6cXnkTDt7tcHkSH7Yo8UE"}'::jsonb,
    body := '{"manual": true}'::jsonb
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Create a table to log token refresh attempts
CREATE TABLE IF NOT EXISTS public.token_refresh_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refresh_type TEXT NOT NULL CHECK (refresh_type IN ('scheduled', 'manual')),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  providers_processed INTEGER DEFAULT 0,
  tokens_refreshed INTEGER DEFAULT 0,
  tokens_failed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on the log table
ALTER TABLE public.token_refresh_logs ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access logs (for admin purposes)
CREATE POLICY "Service role can manage token refresh logs"
ON public.token_refresh_logs
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Add a trigger to update the service_providers table when tokens are refreshed
CREATE OR REPLACE FUNCTION public.update_provider_last_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the provider's last sync time when tokens are refreshed
  IF NEW.access_token IS DISTINCT FROM OLD.access_token THEN
    UPDATE public.service_providers 
    SET updated_at = now() 
    WHERE id = NEW.provider_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to both connection tables
CREATE TRIGGER update_provider_sync_square
  AFTER UPDATE ON public.provider_square_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_last_sync();

CREATE TRIGGER update_provider_sync_platform
  AFTER UPDATE ON public.provider_platform_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_last_sync();