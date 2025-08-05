import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StripeConnectCardProps {
  providerId: string;
}

interface StripeConnection {
  id: string;
  stripe_account_id: string;
  is_active: boolean;
  account_status: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}

export const StripeConnectCard = ({ providerId }: StripeConnectCardProps) => {
  const [stripeConnection, setStripeConnection] = useState<StripeConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStripeConnection();
  }, [providerId]);

  const fetchStripeConnection = async () => {
    try {
      const { data, error } = await supabase
        .from("provider_stripe_connections")
        .select("*")
        .eq("provider_id", providerId)
        .eq("is_active", true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error("Error fetching Stripe connection:", error);
        return;
      }

      setStripeConnection(data as StripeConnection | null);
    } catch (err) {
      console.error("Unexpected error fetching Stripe connection:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripeConnect = async () => {
    setIsConnecting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-account', {
        body: { 
          provider_id: providerId,
          return_url: `${window.location.origin}/provider-dashboard`,
          refresh_url: `${window.location.origin}/provider-dashboard`
        }
      });

      if (error) {
        console.error('Stripe Connect error:', error);
        toast({
          title: "Connection Failed",
          description: "Failed to initiate Stripe connection. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      if (data?.account_link_url) {
        // Open Stripe Connect onboarding in a new tab
        window.open(data.account_link_url, '_blank');
      } else {
        throw new Error('No account link URL received');
      }
    } catch (error) {
      console.error('Error connecting to Stripe:', error);
      toast({
        title: "Connection Failed", 
        description: "Failed to connect to Stripe. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCreateStripeAccount = () => {
    // Open Stripe signup in a new tab
    window.open('https://dashboard.stripe.com/register', '_blank');
  };

  const getConnectionStatus = () => {
    if (!stripeConnection) return null;

    const isFullyEnabled = stripeConnection.charges_enabled && stripeConnection.payouts_enabled;
    
    if (isFullyEnabled) {
      return {
        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
        text: "Connected",
        color: "text-green-600"
      };
    } else {
      return {
        icon: <AlertCircle className="h-4 w-4 text-amber-600" />,
        text: "Setup Required",
        color: "text-amber-600"
      };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Processing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const status = getConnectionStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Processing
          {status && (
            <div className={`flex items-center gap-1 ${status.color}`}>
              {status.icon}
              <span className="text-sm">{status.text}</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stripeConnection ? (
          <>
            <p className="text-sm text-muted-foreground">
              Your Stripe account is connected. You can receive payments directly from customers.
            </p>
            
            {!stripeConnection.charges_enabled || !stripeConnection.payouts_enabled ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 mb-2">
                  Complete your Stripe account setup to start receiving payments.
                </p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleStripeConnect}
                  disabled={isConnecting}
                >
                  Complete Setup
                </Button>
              </div>
            ) : (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✓ Ready to receive payments
                </p>
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage Stripe Account
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Connect your Stripe account to receive payments from customers. Stripe will handle all payment processing securely.
            </p>
            
            <div className="space-y-2">
              <Button 
                onClick={handleStripeConnect}
                disabled={isConnecting}
                className="w-full"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {isConnecting ? "Connecting..." : "Connect Stripe Account"}
              </Button>
              
              <div className="text-center">
                <span className="text-xs text-muted-foreground">Don't have a Stripe account? </span>
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={handleCreateStripeAccount}
                  className="p-0 h-auto text-xs"
                >
                  Create one here
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};