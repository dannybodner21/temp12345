import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CreditCard, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import AddPaymentMethodForm from "@/components/AddPaymentMethodForm";
import { useAuth } from "@/contexts/AuthContext";

const stripePromise = loadStripe("pk_test_51RmLgQCoh4GvC9H5rtS2DTV8QXLVBYcaEblbjuxQmdLWYrndpfakL6t6breCt2XViFy6AVpFEhQR1RGQdDs5QXUl003R1BkcJQ");

interface PaymentMethod {
  id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  is_default: boolean;
  stripe_payment_method_id: string;
}

const PaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    navigate("/auth");
    return null;
  }

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from("customer_payment_methods")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = () => {
    setShowAddForm(false);
    fetchPaymentMethods();
  };

  const handleAddCancel = () => {
    setShowAddForm(false);
  };

  const deletePaymentMethod = async (paymentMethodId: string, stripePaymentMethodId: string) => {
    try {
      // First delete from our database
      const { error: dbError } = await supabase
        .from("customer_payment_methods")
        .delete()
        .eq("id", paymentMethodId);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Payment method removed",
      });

      fetchPaymentMethods();
    } catch (error) {
      console.error("Error deleting payment method:", error);
      toast({
        title: "Error",
        description: "Failed to remove payment method",
        variant: "destructive",
      });
    }
  };

  const getCardIcon = (brand: string) => {
    const brandLower = brand.toLowerCase();
    return <CreditCard className="h-6 w-6" />;
  };

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  return (
    <Elements stripe={stripePromise}>
      <PaymentMethodsContent 
        paymentMethods={paymentMethods}
        loading={loading}
        showAddForm={showAddForm}
        onAddSuccess={handleAddSuccess}
        onAddCancel={handleAddCancel}
        onShowAddForm={() => setShowAddForm(true)}
        onDeletePaymentMethod={deletePaymentMethod}
        navigate={navigate}
      />
    </Elements>
  );
};

const PaymentMethodsContent = ({ 
  paymentMethods, 
  loading, 
  showAddForm, 
  onAddSuccess, 
  onAddCancel, 
  onShowAddForm, 
  onDeletePaymentMethod, 
  navigate 
}: {
  paymentMethods: PaymentMethod[];
  loading: boolean;
  showAddForm: boolean;
  onAddSuccess: () => void;
  onAddCancel: () => void;
  onShowAddForm: () => void;
  onDeletePaymentMethod: (id: string, stripeId: string) => void;
  navigate: (path: string) => void;
}) => {
  const getCardIcon = (brand: string) => {
    return <CreditCard className="h-6 w-6" />;
  };

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Payment Methods</h1>
          </div>
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Payment Methods</h1>
        </div>

        {/* Add Payment Method Button or Form */}
        {showAddForm ? (
          <AddPaymentMethodForm 
            onSuccess={onAddSuccess}
            onCancel={onAddCancel}
            isFirstMethod={paymentMethods.length === 0}
          />
        ) : (
          <Button 
            onClick={onShowAddForm}
            className="w-full mb-6"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>
        )}

        {/* Payment Methods List */}
        <div className="space-y-4">
          {paymentMethods.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No payment methods added yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add a payment method to book services faster
                </p>
              </CardContent>
            </Card>
          ) : (
            paymentMethods.map((method) => (
              <Card key={method.id} className="border-border">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getCardIcon(method.card_brand)}
                      <div>
                        <div className="font-medium">
                          {formatCardBrand(method.card_brand)} •••• {method.card_last4}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Expires {String(method.card_exp_month).padStart(2, '0')}/{method.card_exp_year}
                          {method.is_default && (
                            <span className="ml-2 text-primary font-medium">Default</span>
                          )}
                        </div>
                      </div>
                    </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeletePaymentMethod(method.id, method.stripe_payment_method_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Note about security */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            Your payment information is securely stored and encrypted. 
            We never store your full card details.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethods;