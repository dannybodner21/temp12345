-- Update WrightLooks lash and brow services to be categorized under Beauty
UPDATE services 
SET category_id = (SELECT id FROM service_categories WHERE name = 'Beauty')
WHERE name IN ('Brow Lamination', 'Brow Lamination with Tint', 'Lash Lift', 'Lash Lift & Tint')
  AND provider_id IN (SELECT id FROM service_providers WHERE business_name = 'WrightLooks');