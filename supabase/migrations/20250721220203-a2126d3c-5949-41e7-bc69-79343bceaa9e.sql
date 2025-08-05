-- Create customer_payment_methods table to store payment method references
CREATE TABLE public.customer_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  payment_method_type TEXT NOT NULL, -- 'card', 'apple_pay', etc.
  card_brand TEXT, -- 'visa', 'mastercard', etc.
  card_last4 TEXT, -- last 4 digits
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_payment_methods ENABLE ROW LEVEL SECURITY;

-- Users can only view their own payment methods
CREATE POLICY "Users can view their own payment methods" 
ON public.customer_payment_methods 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own payment methods
CREATE POLICY "Users can insert their own payment methods" 
ON public.customer_payment_methods 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own payment methods
CREATE POLICY "Users can update their own payment methods" 
ON public.customer_payment_methods 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own payment methods
CREATE POLICY "Users can delete their own payment methods" 
ON public.customer_payment_methods 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for timestamps
CREATE TRIGGER update_customer_payment_methods_updated_at
BEFORE UPDATE ON public.customer_payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();