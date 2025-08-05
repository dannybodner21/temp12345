import { Calendar, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatTimeInPacific, formatDateInPacific } from "@/lib/timezone";

interface Booking {
  id: string;
  booking_date: string;
  total_price: number;
  status: string;
  customer_notes?: string;
  service_id: string;
  time_slot_id: string;
  services: {
    name: string;
    provider_id: string;
    service_providers: {
      business_name: string;
      address: string;
      city: string;
      state: string;
    };
  };
  time_slots: {
    date: string;
    start_time: string;
    end_time: string;
  };
}

// Placeholder bookings for demo purposes
const placeholderBookings: Booking[] = [
  {
    id: "placeholder-1",
    booking_date: "2024-02-15T14:00:00Z",
    total_price: 120,
    status: "confirmed",
    customer_notes: null,
    service_id: "placeholder-service-1",
    time_slot_id: "placeholder-slot-1",
    services: {
      name: "60-Minute Swedish Massage",
      provider_id: "placeholder-provider-1",
      service_providers: {
        business_name: "Serenity Spa",
        address: "123 Wellness Ave",
        city: "Los Angeles",
        state: "CA"
      }
    },
    time_slots: {
      date: "2024-02-15",
      start_time: "14:00:00",
      end_time: "15:00:00"
    }
  },
  {
    id: "placeholder-2",
    booking_date: "2024-02-20T11:00:00Z",
    total_price: 85,
    status: "pending",
    customer_notes: "Please use gentle pressure",
    service_id: "placeholder-service-2",
    time_slot_id: "placeholder-slot-2",
    services: {
      name: "Facial Treatment",
      provider_id: "placeholder-provider-2",
      service_providers: {
        business_name: "Glow Wellness",
        address: "456 Beauty Blvd",
        city: "Beverly Hills",
        state: "CA"
      }
    },
    time_slots: {
      date: "2024-02-20",
      start_time: "11:00:00",
      end_time: "12:30:00"
    }
  }
];

const Bookings = () => {
  const [realBookings, setRealBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingBookingId, setCancelingBookingId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // Combine real bookings with placeholder bookings
  const bookings = [...realBookings, ...placeholderBookings];

  // Fetch user's bookings
  const fetchBookings = async () => {
    try {
      // Clean up expired guest email storage
      const guestEmailExpiry = localStorage.getItem('lastBookingEmailExpiry');
      if (guestEmailExpiry && new Date() > new Date(guestEmailExpiry)) {
        localStorage.removeItem('lastBookingEmail');
        localStorage.removeItem('lastBookingEmailExpiry');
      }

      let bookingsData = [];
      
      // Fetch authenticated user bookings
      if (user) {
        const { data: userBookings, error: userError } = await supabase
          .from("bookings")
          .select(`
            *,
            services (
              name,
              provider_id,
              service_providers (
                business_name,
                address,
                city,
                state
              )
            ),
            time_slots (
              date,
              start_time,
              end_time
            )
          `)
          .eq("user_id", user.id)
          .neq("status", "cancelled")
          .order("booking_date", { ascending: true });

        if (userError) {
          console.error("Error fetching user bookings:", userError);
        } else if (userBookings) {
          bookingsData.push(...userBookings);
        }
      }

      // Also fetch guest bookings based on email stored in localStorage
      const guestEmail = localStorage.getItem('lastBookingEmail');
      console.log('Guest email from localStorage:', guestEmail);
      console.log('All localStorage keys:', Object.keys(localStorage));
      if (guestEmail) {
        const { data: guestBookings, error: guestError } = await supabase
          .from("bookings")
          .select(`
            *,
            services!inner (
              name,
              provider_id,
              service_providers!inner (
                business_name,
                address,
                city,
                state
              )
            ),
            time_slots!inner (
              date,
              start_time,
              end_time
            )
          `)
          .is("user_id", null)
          .ilike("customer_notes", `%${guestEmail}%`)
          .in("status", ["pending", "confirmed"])
          .order("booking_date", { ascending: true });

        console.log('Guest bookings query result:', { guestBookings, guestError });

        if (guestError) {
          console.error("Error fetching guest bookings:", guestError);
        } else if (guestBookings) {
          // Filter out duplicates (in case user made both guest and authenticated bookings)
          const existingIds = bookingsData.map(b => b.id);
          const newGuestBookings = guestBookings.filter(b => !existingIds.includes(b.id));
          bookingsData.push(...newGuestBookings);
        }
      }

      setRealBookings(bookingsData as Booking[]);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast({
        title: "Error loading bookings",
        description: "Failed to load your bookings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user, searchParams]); // Also refetch when URL params change

  const showComingSoon = (feature: string) => {
    toast({
      title: "Coming Soon!",
      description: `${feature} feature is currently under development. Stay tuned!`,
    });
  };

  const handleCancelClick = (bookingId: string) => {
    setCancelingBookingId(bookingId);
    setIsConfirmOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!cancelingBookingId) return;

    try {
      const booking = bookings.find(b => b.id === cancelingBookingId);
      if (!booking) return;

      // Update booking status to cancelled
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", cancelingBookingId);

      if (bookingError) throw bookingError;

      // Make the time slot available again
      const { error: slotError } = await supabase
        .from("time_slots")
        .update({ is_available: true })
        .eq("id", booking.time_slot_id);

      if (slotError) throw slotError;

      toast({
        title: "Booking cancelled",
        description: "Your booking has been successfully cancelled.",
      });

      // Remove the cancelled booking from the real bookings list (placeholder bookings can't be cancelled)
      setRealBookings(prev => prev.filter(b => b.id !== cancelingBookingId));
      
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast({
        title: "Cancellation failed", 
        description: "Failed to cancel your booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConfirmOpen(false);
      setCancelingBookingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return formatDateInPacific(dateStr);
  };

  const formatTime = (timeStr: string) => {
    return formatTimeInPacific(timeStr);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto px-6 py-8 pt-12 lg:pt-20">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">My Bookings</h1>
            <p className="text-muted-foreground">View and manage your upcoming appointments</p>
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading your bookings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-6 py-8 pt-12 lg:pt-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            My Bookings
          </h1>
          <p className="text-muted-foreground">
            View and manage your upcoming appointments
          </p>
        </div>

        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{booking.services.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {booking.services.service_providers.business_name}
                    </p>
                  </div>
                  <Badge 
                    variant={booking.status === "confirmed" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {booking.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(booking.time_slots.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(booking.time_slots.start_time)} - {formatTime(booking.time_slots.end_time)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {booking.services.service_providers.address}, {booking.services.service_providers.city}, {booking.services.service_providers.state}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lg text-foreground">
                    {formatPrice(booking.total_price)}
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleCancelClick(booking.id)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {bookings.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No bookings yet
            </h3>
            <p className="text-muted-foreground mb-4">
              Start browsing services to make your first booking
            </p>
            <Button onClick={() => window.location.href = "/services"}>
              Browse Services
            </Button>
          </div>
        )}

        {/* Cancellation Confirmation Dialog */}
        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this booking? This action cannot be undone.
                The time slot will become available for other customers to book.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, Keep Booking</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, Cancel Booking
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Bookings;