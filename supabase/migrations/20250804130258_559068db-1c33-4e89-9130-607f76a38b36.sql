-- Update all hair-related services to be categorized under Hair
UPDATE services 
SET category_id = (SELECT id FROM service_categories WHERE name = 'Hair')
WHERE (
  name ILIKE '%hair%' 
  OR name ILIKE '%haircut%' 
  OR name ILIKE '%beard%'
  OR name ILIKE '%scalp%'
) 
AND category_id IS NULL;