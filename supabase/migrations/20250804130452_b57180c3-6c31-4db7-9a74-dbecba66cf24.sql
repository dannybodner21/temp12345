-- Comprehensive service categorization update
-- Update services based on keywords in their names

-- Beauty services (facials, skincare, injectables, lashes, brows)
UPDATE services 
SET category_id = (SELECT id FROM service_categories WHERE name = 'Beauty')
WHERE category_id IS NULL AND (
  name ILIKE '%facial%' OR 
  name ILIKE '%botox%' OR 
  name ILIKE '%filler%' OR 
  name ILIKE '%lip%' OR 
  name ILIKE '%microneedling%' OR 
  name ILIKE '%peel%' OR 
  name ILIKE '%glow%' OR 
  name ILIKE '%skincare%' OR
  name ILIKE '%eyelash%' OR
  name ILIKE '%lash%' OR
  name ILIKE '%eyebrow%' OR
  name ILIKE '%brow%' OR
  name ILIKE '%beauty%' OR
  name ILIKE '%prp%' OR
  name ILIKE '%rf%' OR
  name ILIKE '%jeuveau%' OR
  name ILIKE '%xeomin%'
);

-- Hair services  
UPDATE services 
SET category_id = (SELECT id FROM service_categories WHERE name = 'Hair')
WHERE category_id IS NULL AND (
  name ILIKE '%hair%' OR 
  name ILIKE '%haircut%' OR 
  name ILIKE '%color%' OR 
  name ILIKE '%blowout%' OR 
  name ILIKE '%waves%' OR 
  name ILIKE '%extension%' OR 
  name ILIKE '%roots%' OR 
  name ILIKE '%mullet%' OR 
  name ILIKE '%taper%'
);

-- Massage services
UPDATE services 
SET category_id = (SELECT id FROM service_categories WHERE name = 'Massage')
WHERE category_id IS NULL AND (
  name ILIKE '%massage%'
);

-- Nail services 
UPDATE services 
SET category_id = (SELECT id FROM service_categories WHERE name = 'Nail Care')
WHERE category_id IS NULL AND (
  name ILIKE '%nail%' OR 
  name ILIKE '%manicure%' OR 
  name ILIKE '%pedicure%' OR 
  name ILIKE '%gel%'
);

-- Wellness services (therapy, IV, chiropractic, cold plunge)
UPDATE services 
SET category_id = (SELECT id FROM service_categories WHERE name = 'Wellness')
WHERE category_id IS NULL AND (
  name ILIKE '%therapy%' OR 
  name ILIKE '%iv%' OR 
  name ILIKE '%chiropractic%' OR 
  name ILIKE '%cold plunge%' OR 
  name ILIKE '%sauna%' OR 
  name ILIKE '%wellness%' OR
  name ILIKE '%sound%' OR
  name ILIKE '%acoustic%'
);

-- Create Nail Care category if it doesn't exist
INSERT INTO service_categories (name, description, icon_name)
SELECT 'Nail Care', 'Professional nail services including manicures and pedicures', 'palette'
WHERE NOT EXISTS (
  SELECT 1 FROM service_categories WHERE name = 'Nail Care'
);

-- Create Wellness category if it doesn't exist  
INSERT INTO service_categories (name, description, icon_name)
SELECT 'Wellness', 'Holistic wellness and therapy services', 'brain'
WHERE NOT EXISTS (
  SELECT 1 FROM service_categories WHERE name = 'Wellness'
);

-- Assign any remaining uncategorized services to "Uncategorized Services"
UPDATE services 
SET category_id = (SELECT id FROM service_categories WHERE name = 'Uncategorized Services')
WHERE category_id IS NULL;