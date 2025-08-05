-- Allow guest bookings by making user_id nullable
ALTER TABLE bookings ALTER COLUMN user_id DROP NOT NULL;

-- Update RLS policies to handle guest bookings
DROP POLICY IF EXISTS "Users can create their own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;

-- Create new policies that handle both authenticated users and guest bookings
CREATE POLICY "Users can create bookings" ON bookings
FOR INSERT
WITH CHECK (
  -- Authenticated users can only create bookings for themselves
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  -- Guest bookings (user_id is null) are allowed
  (auth.uid() IS NULL AND user_id IS NULL)
);

CREATE POLICY "Users can view their own bookings" ON bookings
FOR SELECT
USING (
  -- Authenticated users can view their own bookings
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  -- Providers can view bookings for their services (existing policy logic)
  (service_id IN (
    SELECT s.id FROM services s
    JOIN service_providers sp ON s.provider_id = sp.id
    WHERE sp.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can update their own bookings" ON bookings
FOR UPDATE
USING (
  -- Authenticated users can update their own bookings
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  -- Providers can update bookings for their services (existing policy logic)
  (service_id IN (
    SELECT s.id FROM services s
    JOIN service_providers sp ON s.provider_id = sp.id
    WHERE sp.user_id = auth.uid()
  ))
);