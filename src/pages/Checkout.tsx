import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CreditCard, User, Mail, Phone, MapPin, Info } from "lucide-react";

interface CheckoutData {
  serviceId: string;
  timeSlotId: string;
  serviceName: string;
  providerName: string;
  providerPhone?: string;
  providerEmail?: string;
  providerAddress?: string;
  providerCity?: string;
  providerState?: string;
  providerZipCode?: string;
  originalPrice: number;
  discountedPrice: number;
  timeSlot: string;
  date: string;
  duration: number;
}

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const checkoutData = location.state as CheckoutData;

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    zipCode: "",
    createAccount: false
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [serviceDetails, setServiceDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Checkout page loaded, checkoutData:', checkoutData);
    
    if (!checkoutData) {
      console.log('No checkout data found, redirecting to home');
      // Check if we have booking data in localStorage as fallback
      const lastServiceName = localStorage.getItem('lastBookingServiceName');
      if (!lastServiceName) {
        navigate("/");
        return;
      }
      // If we have partial data, show a message and redirect
      toast({
        title: "Session Expired",
        description: "Please select your service again to continue booking.",
        variant: "destructive"
      });
      navigate("/");
      return;
    }

    const fetchServiceDetails = async () => {
      console.log('Fetching service details for:', checkoutData.serviceId);
      try {
        const { data, error } = await supabase
          .from('services')
          .select('allows_post_appointment_adjustment')
          .eq('id', checkoutData.serviceId)
          .single();

        if (error) {
          console.error('Error fetching service details:', error);
        } else {
          setServiceDetails(data);
        }
      } catch (error) {
        console.error('Error fetching service details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServiceDetails();
  }, [checkoutData, navigate]);

  if (!checkoutData || loading) {
    console.log('Checkout page showing loading state', { checkoutData: !!checkoutData, loading });
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="text-lg font-medium mb-2">Loading checkout...</div>
        {!checkoutData && <div className="text-sm text-muted-foreground">No checkout data available</div>}
      </div>
    </div>;
  }

  // Check if this service allows post-appointment adjustments (deposit model)
  const isDepositService = serviceDetails?.allows_post_appointment_adjustment;
  const depositAmount = 50; // Standard $50 deposit
  
  // The discount percentage shown is already the customer discount (provider discount minus platform fee)
  const customerDiscountPercent = checkoutData.originalPrice > checkoutData.discountedPrice 
    ? Math.round(((checkoutData.originalPrice - checkoutData.discountedPrice) / checkoutData.originalPrice) * 100)
    : 0;
  
  const customerPrice = checkoutData.discountedPrice;
  const chargeAmount = isDepositService ? depositAmount : customerPrice;
  const latelyCommission = checkoutData.originalPrice * 0.07;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Create payment session
      const { data, error } = await supabase.functions.invoke('create-booking-payment', {
        body: {
          serviceId: checkoutData.serviceId,
          timeSlotId: checkoutData.timeSlotId,
          customerInfo: formData,
          amount: Math.round(chargeAmount * 100), // Convert to cents
          fullPrice: Math.round(customerPrice * 100), // Full price for deposit services
          isDepositService,
          serviceName: checkoutData.serviceName,
          providerName: checkoutData.providerName
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Store booking details for success page
        localStorage.setItem('lastBookingDuration', checkoutData.duration.toString());
        localStorage.setItem('lastBookingServiceName', checkoutData.serviceName);
        localStorage.setItem('lastBookingDateTime', `${checkoutData.date} ${checkoutData.timeSlot}`);
        localStorage.setItem('lastBookingProviderName', checkoutData.providerName);
        localStorage.setItem('lastBookingEmail', formData.email); // Store email for guest booking lookup
        // Set expiry for guest email (30 days from now)
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        localStorage.setItem('lastBookingEmailExpiry', expiry.toISOString());
        if (checkoutData.providerPhone) {
          localStorage.setItem('lastBookingProviderPhone', checkoutData.providerPhone);
        }
        if (checkoutData.providerAddress) {
          localStorage.setItem('lastBookingProviderAddress', checkoutData.providerAddress);
        }
        if (checkoutData.providerCity) {
          localStorage.setItem('lastBookingProviderCity', checkoutData.providerCity);
        }
        if (checkoutData.providerState) {
          localStorage.setItem('lastBookingProviderState', checkoutData.providerState);
        }
        if (checkoutData.providerZipCode) {
          localStorage.setItem('lastBookingProviderZipCode', checkoutData.providerZipCode);
        }
        // Open Stripe Checkout in a new tab to avoid iframe restrictions
        window.open(data.url, '_blank');
      } else {
        throw new Error("No payment URL received");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">{/* Added pb-20 for bottom nav spacing */}
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 pt-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Checkout</h1>
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Services
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Customer Information Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="zipCode" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Zip Code *
                  </Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    required
                  />
                </div>


                <div className="flex items-center space-x-2">
                  <input
                    id="createAccount"
                    name="createAccount"
                    type="checkbox"
                    checked={formData.createAccount}
                    onChange={handleInputChange}
                    className="rounded border-input"
                  />
                  <Label htmlFor="createAccount" className="text-sm">
                    Create an account for faster checkout next time
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {isProcessing ? "Processing..." : "Continue to Payment"}
                </Button>
              </form>
            </CardContent>
          </Card>

           {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Service Details */}
              <div>
                <h3 className="font-semibold text-lg">{checkoutData.serviceName}</h3>
                <p className="text-muted-foreground">{checkoutData.providerName}</p>
                <p className="text-sm text-muted-foreground">
                  {checkoutData.date} at {checkoutData.timeSlot}
                </p>
                <p className="text-sm text-muted-foreground">
                  Duration: {checkoutData.duration} minutes
                </p>
              </div>

              {/* Provider Contact & Location */}
              {(checkoutData.providerAddress || checkoutData.providerPhone) && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">Provider Information</h4>
                  
                  {checkoutData.providerPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{checkoutData.providerPhone}</span>
                    </div>
                  )}
                  
                  {checkoutData.providerAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="text-sm">
                        {/* Add special prefix for Salon Republic */}
                        {checkoutData.providerAddress === "8550 Santa Monica Blvd" && (
                          <div className="font-medium">Salon Republic West Hollywood @ Santa Monica</div>
                        )}
                        <div>{checkoutData.providerAddress}</div>
                        {(checkoutData.providerCity || checkoutData.providerState || checkoutData.providerZipCode) && (
                          <div>
                            {checkoutData.providerCity && checkoutData.providerCity}
                            {checkoutData.providerState && `, ${checkoutData.providerState}`}
                            {checkoutData.providerZipCode && ` ${checkoutData.providerZipCode}`}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Pricing Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Original Price</span>
                  <span>${checkoutData.originalPrice.toFixed(2)}</span>
                </div>

                {customerDiscountPercent > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-2">
                      Discount
                      <Badge variant="secondary" className="text-xs">
                        {customerDiscountPercent}% OFF
                      </Badge>
                    </span>
                    <span>-${(checkoutData.originalPrice - customerPrice).toFixed(2)}</span>
                  </div>
                )}


                <Separator />

                {isDepositService ? (
                  <>
                    <div className="flex justify-between">
                      <span>Service Total</span>
                      <span>${customerPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg text-primary">
                      <span>Deposit Due Today</span>
                      <span>${depositAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Remaining Balance</span>
                      <span>${(customerPrice - depositAmount).toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>${customerPrice.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Deposit Service Info */}
              {isDepositService && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium mb-1 text-blue-800">Deposit Service</h4>
                      <p className="text-sm text-blue-700">
                        You're paying a ${depositAmount} deposit today. The provider will determine the final cost after your appointment, and you'll be charged the remaining balance (minus this deposit and any applicable discounts).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Info */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Payment Details</h4>
                <p className="text-sm text-muted-foreground">
                  You'll be redirected to our secure payment processor to complete your booking.
                </p>
              </div>

              {/* Non-refundable Notice */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <h4 className="font-medium mb-2 text-amber-800">Important Notice</h4>
                <p className="text-sm text-amber-700">
                  All bookings are final and non-refundable once confirmed. Please ensure your selected date and time work for your schedule before proceeding with payment.
                </p>
              </div>

              {/* Terms */}
              <div className="text-xs text-muted-foreground space-y-2">
                <p>
                  Lately is a platform for booking services and is not responsible for services rendered. 
                  All services are performed by independent providers.
                </p>
                <p>
                  By proceeding with payment, you agree to our{" "}
                  <a 
                    href="/terms" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline"
                  >
                    Terms of Service
                  </a>{" "}
                  and acknowledge our{" "}
                  <a 
                    href="/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </a>. Cancellation policies may apply.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}