-- Insert the missing Square connection for WrightLooks
INSERT INTO provider_square_connections (
  provider_id,
  square_application_id,
  square_merchant_id,
  access_token,
  refresh_token,
  scope,
  expires_at,
  is_active
)
SELECT 
  ppc.provider_id,
  (ppc.platform_specific_data->>'square_application_id')::text,
  ppc.platform_user_id,
  ppc.access_token,
  ppc.refresh_token,
  ppc.scope,
  ppc.expires_at,
  ppc.is_active
FROM provider_platform_connections ppc
WHERE ppc.platform = 'square' 
  AND ppc.provider_id = '8266286d-0ed1-4a85-a857-13ce31e527b3'
  AND NOT EXISTS (
    SELECT 1 FROM provider_square_connections psc 
    WHERE psc.provider_id = ppc.provider_id
  );