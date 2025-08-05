import { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";

interface AddPaymentMethodFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  isFirstMethod: boolean;
}

const AddPaymentMethodForm = ({ onSuccess, onCancel, isFirstMethod }: AddPaymentMethodFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // Get setup intent from our edge function
      const { data: setupData, error: setupError } = await supabase.functions.invoke(
        "create-setup-intent"
      );

      if (setupError) throw setupError;

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      // Confirm the setup intent with the payment method
      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        setupData.client_secret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (setupIntent?.payment_method) {
        // Save payment method to our database
        const { error: saveError } = await supabase.functions.invoke("save-payment-method", {
          body: {
            payment_method_id: setupIntent.payment_method,
            customer_id: setupData.customer_id,
            is_default: isFirstMethod, // First method is default
          },
        });

        if (saveError) throw saveError;

        toast({
          title: "Success",
          description: "Payment method added successfully",
        });

        onSuccess();
      }
    } catch (error: any) {
      console.error("Error adding payment method:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add payment method",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Add Payment Method</CardTitle>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Card Information</label>
            <div className="p-3 border border-input rounded-md bg-background">
              <CardElement options={cardElementOptions} />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={!stripe || loading}
              className="flex-1"
            >
              {loading ? "Adding..." : "Add Payment Method"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
        
        <div className="mt-4 p-3 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground">
            Your payment information is secure and encrypted. We use Stripe to process payments safely.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddPaymentMethodForm;