-- Add database constraint to ensure all services have categories
-- First, update any existing services without categories to have the default platform category
UPDATE services 
SET category_id = (
  SELECT id FROM service_categories 
  WHERE name = CASE 
    WHEN sync_source = 'square' THEN 'Square Services'
    WHEN sync_source IS NOT NULL THEN 'Platform Services'
    ELSE 'Uncategorized Services'
  END
  LIMIT 1
)
WHERE category_id IS NULL;

-- Create "Uncategorized Services" category if it doesn't exist
INSERT INTO service_categories (name, description, icon_name)
SELECT 'Uncategorized Services', 'Services that need manual categorization', 'tag'
WHERE NOT EXISTS (
  SELECT 1 FROM service_categories WHERE name = 'Uncategorized Services'
);

-- Add a check constraint to ensure all new services have categories
-- Using a validation trigger instead of CHECK constraint for flexibility
CREATE OR REPLACE FUNCTION validate_service_category()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category_id IS NULL THEN
    -- Auto-assign to default category based on sync source or name
    IF NEW.sync_source = 'square' THEN
      SELECT id INTO NEW.category_id FROM service_categories WHERE name = 'Square Services' LIMIT 1;
    ELSIF NEW.sync_source IS NOT NULL THEN
      SELECT id INTO NEW.category_id FROM service_categories WHERE name = 'Platform Services' LIMIT 1;
    ELSE
      SELECT id INTO NEW.category_id FROM service_categories WHERE name = 'Uncategorized Services' LIMIT 1;
    END IF;
    
    -- If still null, raise an error
    IF NEW.category_id IS NULL THEN
      RAISE EXCEPTION 'Service must have a category assigned. Please assign a category before creating the service.';
    END IF;
    
    -- Log for admin review
    RAISE NOTICE 'Service "%" was auto-assigned to category due to missing category_id', NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT and UPDATE
DROP TRIGGER IF EXISTS ensure_service_category ON services;
CREATE TRIGGER ensure_service_category
  BEFORE INSERT OR UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION validate_service_category();