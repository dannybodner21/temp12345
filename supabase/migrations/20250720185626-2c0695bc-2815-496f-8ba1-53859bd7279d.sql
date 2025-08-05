-- Update the admin function to be more flexible for development
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- For development/demo purposes, allow any authenticated user to be admin
  -- In production, you should restrict this to specific emails/roles
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;