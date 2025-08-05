-- Create a security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- For now, check if user email contains 'admin' or is a specific admin email
  -- You can modify this logic as needed
  RETURN (
    SELECT email LIKE '%admin%' OR email = 'your-admin-email@example.com'
    FROM auth.users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Add admin policy for services table
CREATE POLICY "Admins can manage all services" 
ON public.services 
FOR ALL 
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Add admin policy for time_slots table  
CREATE POLICY "Admins can manage all time slots"
ON public.time_slots
FOR ALL
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());