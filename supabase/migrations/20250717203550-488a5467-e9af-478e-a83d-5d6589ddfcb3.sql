-- Drop the existing restrictive policy and create a more appropriate one
DROP POLICY IF EXISTS "Providers can manage their own profile" ON public.service_providers;

-- Create a policy that allows authenticated users to view their own provider profile
CREATE POLICY "Users can view their own provider profile" 
ON public.service_providers 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Create a policy that allows providers to update their own profile
CREATE POLICY "Providers can update their own profile" 
ON public.service_providers 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Create a policy that allows providers to insert their own profile (for signup)
CREATE POLICY "Users can insert their own provider profile" 
ON public.service_providers 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);