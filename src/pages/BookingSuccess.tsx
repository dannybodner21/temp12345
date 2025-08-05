import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Calendar, Home, Clock, Phone, MapPin } from "lucide-react";

// Helper function to format phone number
const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  const digits = phone.replace(/\D/g, '');
  
  // Check if we have a US phone number (10 digits)
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // If it's not a standard US number, return as-is
  return phone;
};

export default function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [isLoading, setIsLoading] = useState(true);
  const [serviceDuration, setServiceDuration] = useState<number | null>(null);
  const [serviceName, setServiceName] = useState<string | null>(null);
  const [bookingDateTime, setBookingDateTime] = useState<string | null>(null);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [providerPhone, setProviderPhone] = useState<string | null>(null);
  const [providerAddress, setProviderAddress] = useState<string | null>(null);
  const [providerCity, setProviderCity] = useState<string | null>(null);
  const [providerState, setProviderState] = useState<string | null>(null);
  const [providerZipCode, setProviderZipCode] = useState<string | null>(null);

  useEffect(() => {
    // Get booking details from localStorage
    const duration = localStorage.getItem('lastBookingDuration');
    const service = localStorage.getItem('lastBookingServiceName');
    const dateTime = localStorage.getItem('lastBookingDateTime');
    const provider = localStorage.getItem('lastBookingProviderName');
    const phone = localStorage.getItem('lastBookingProviderPhone');
    const guestEmail = localStorage.getItem('lastBookingEmail');
    const address = localStorage.getItem('lastBookingProviderAddress');
    const city = localStorage.getItem('lastBookingProviderCity');
    const state = localStorage.getItem('lastBookingProviderState');
    const zipCode = localStorage.getItem('lastBookingProviderZipCode');
    
    if (duration) {
      setServiceDuration(parseInt(duration));
      localStorage.removeItem('lastBookingDuration');
    }
    if (service) {
      setServiceName(service);
      localStorage.removeItem('lastBookingServiceName');
    }
    if (dateTime) {
      setBookingDateTime(dateTime);
      localStorage.removeItem('lastBookingDateTime');
    }
    if (provider) {
      setProviderName(provider);
      localStorage.removeItem('lastBookingProviderName');
    }
    if (phone) {
      setProviderPhone(phone);
      localStorage.removeItem('lastBookingProviderPhone');
    }
    if (address) {
      setProviderAddress(address);
      localStorage.removeItem('lastBookingProviderAddress');
    }
    if (city) {
      setProviderCity(city);
      localStorage.removeItem('lastBookingProviderCity');
    }
    if (state) {
      setProviderState(state);
      localStorage.removeItem('lastBookingProviderState');
    }
    if (zipCode) {
      setProviderZipCode(zipCode);
      localStorage.removeItem('lastBookingProviderZipCode');
    }

    // Store guest email for later booking lookup but don't remove it immediately
    // We'll keep it for 30 days to allow guest users to see their bookings
    if (guestEmail) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      localStorage.setItem('lastBookingEmailExpiry', expiryDate.toISOString());
    }

    // Simulate verification process
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Confirming your booking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <CheckCircle className="h-16 w-16 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-center">
                Booking Confirmed!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Your appointment has been successfully booked. You'll receive a confirmation email shortly with all the details.
              </p>

              {/* Service details */}
              {(serviceName || bookingDateTime) && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  {serviceName && (
                    <div>
                      <p className="font-medium text-sm text-muted-foreground">Service</p>
                      <p className="font-semibold">{serviceName}</p>
                    </div>
                  )}
                  {bookingDateTime && (
                    <div>
                      <p className="font-medium text-sm text-muted-foreground">Date & Time</p>
                      <p className="font-semibold">{bookingDateTime}</p>
                    </div>
                  )}
                </div>
              )}

              {sessionId && (
                <div className="bg-muted p-3 rounded text-sm">
                  <p className="font-medium">Confirmation ID:</p>
                  <p className="font-mono text-xs break-all">{sessionId}</p>
                </div>
              )}

              {/* Provider contact info */}
              {(providerName || providerPhone || providerAddress) && (
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <h3 className="font-semibold text-sm text-center">Provider Contact Information</h3>
                  
                   {providerName && (
                     <div className="text-center">
                       <p className="font-medium text-sm text-muted-foreground">Business</p>
                       <p className="font-semibold">{providerName}</p>
                     </div>
                   )}
                  
                   {providerPhone && (
                     <div className="flex flex-col items-center gap-2">
                       <div className="flex items-center gap-2">
                         <Phone className="h-4 w-4 text-muted-foreground" />
                         <p className="font-medium text-sm text-muted-foreground">Phone</p>
                       </div>
                       <a 
                         href={`tel:${providerPhone}`} 
                         className="font-semibold text-primary underline hover:text-primary/80"
                       >
                         {formatPhoneNumber(providerPhone)}
                       </a>
                     </div>
                   )}
                  
                   {(providerAddress || providerCity || providerState) && (
                     <div className="flex flex-col items-center gap-2">
                       <div className="flex items-center gap-2">
                         <MapPin className="h-4 w-4 text-muted-foreground" />
                         <p className="font-medium text-sm text-muted-foreground">Address</p>
                       </div>
                      <div className="text-center">
                          <p className="font-semibold text-sm">
                            {/* Add special prefix for Salon Republic */}
                            {providerAddress === "8550 Santa Monica Blvd" && (
                              <>
                                <div className="font-medium">Salon Republic West Hollywood @ Santa Monica</div>
                              </>
                            )}
                            {providerAddress && `${providerAddress}`}
                            {(providerCity || providerState || providerZipCode) && (
                              <>
                                {providerAddress && <br />}
                                {providerCity && providerCity}
                                {providerState && `, ${providerState}`}
                                {providerZipCode && ` ${providerZipCode}`}
                              </>
                            )}
                          </p>
                        </div>
                     </div>
                   )}
                  
                   <p className="text-xs text-muted-foreground mt-2 text-center">
                     Feel free to call your provider if you have any questions before your appointment.
                   </p>
                </div>
              )}

              {/* Early arrival reminder for short appointments */}
              {serviceDuration && serviceDuration <= 30 && (
                <Alert className="mt-4">
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Quick Reminder:</strong> Since this is a {serviceDuration}-minute appointment, 
                    please plan to arrive at least 5 minutes early to ensure we can start on time. 
                    This helps us maintain our schedule for all clients. Thank you!
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2 pt-4">
                <Button 
                  onClick={() => {
                    // Force a timestamp to refresh bookings when navigating
                    navigate('/bookings?refresh=' + Date.now());
                  }}
                  className="w-full"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View My Bookings
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}