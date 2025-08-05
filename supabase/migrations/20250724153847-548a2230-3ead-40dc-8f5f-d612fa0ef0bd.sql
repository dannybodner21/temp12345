-- Add admin policy for service_providers table to allow admins to manage all provider profiles
CREATE POLICY "Admins can manage all provider profiles" 
ON public.service_providers 
FOR ALL 
USING (is_admin_user())
WITH CHECK (is_admin_user());