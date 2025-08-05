-- Update By Jane's manicure services to be properly categorized
UPDATE services 
SET category_id = 'c7ab5843-38b5-43bf-a3e9-39725e2e1df9'
WHERE id IN ('789dbb97-fafb-4a3f-9094-eea38a8a6474', '36a6ee42-2bb8-4614-a19c-eca618a6a949')
AND provider_id IN (SELECT id FROM service_providers WHERE business_name = 'By Jane');

-- Also update the gel pedicure service to the same category
UPDATE services 
SET category_id = 'c7ab5843-38b5-43bf-a3e9-39725e2e1df9'
WHERE id = '7ce656f0-f71b-45db-b0c4-77a167609121'
AND provider_id IN (SELECT id FROM service_providers WHERE business_name = 'By Jane');