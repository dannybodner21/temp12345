import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, DollarSign, Calendar, User, AlertCircle } from "lucide-react";

interface PostAppointmentChargingProps {
  providerId: string;
}

interface DepositBooking {
  id: string;
  service_name: string;
  customer_name: string;
  appointment_date: string;
  deposit_amount: number;
  total_price: number;
  deposit_paid: boolean;
  final_cost: number | null;
  final_payment_status: string;
  provider_notes_internal: string | null;
  customer_notes: string | null;
}

export default function PostAppointmentCharging({ providerId }: PostAppointmentChargingProps) {
  const [bookings, setBookings] = useState<DepositBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<{ [key: string]: boolean }>({});
  const [finalCosts, setFinalCosts] = useState<{ [key: string]: string }>({});
  const [providerNotes, setProviderNotes] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchDepositBookings();
  }, [providerId]);

  const fetchDepositBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          deposit_amount,
          total_price,
          deposit_paid,
          final_cost,
          final_payment_status,
          provider_notes_internal,
          customer_notes,
          booking_date,
          service:services(name),
          time_slot:time_slots(date, start_time)
        `)
        .eq('service.provider_id', providerId)
        .eq('deposit_paid', true)
        .in('final_payment_status', ['pending', 'failed'])
        .order('booking_date', { ascending: false });

      if (error) {
        console.error('Error fetching deposit bookings:', error);
        toast({
          title: "Error",
          description: "Failed to load bookings",
          variant: "destructive"
        });
        return;
      }

      const formattedBookings = data?.map(booking => ({
        id: booking.id,
        service_name: booking.service?.name || 'Unknown Service',
        customer_name: extractCustomerName(booking.customer_notes),
        appointment_date: formatAppointmentDate(booking.time_slot?.date, booking.time_slot?.start_time),
        deposit_amount: booking.deposit_amount || 50,
        total_price: booking.total_price,
        deposit_paid: booking.deposit_paid,
        final_cost: booking.final_cost,
        final_payment_status: booking.final_payment_status,
        provider_notes_internal: booking.provider_notes_internal,
        customer_notes: booking.customer_notes
      })) || [];

      setBookings(formattedBookings);

      // Initialize final costs with existing values or original price
      const initialCosts: { [key: string]: string } = {};
      const initialNotes: { [key: string]: string } = {};
      
      formattedBookings.forEach(booking => {
        initialCosts[booking.id] = booking.final_cost?.toString() || booking.total_price.toString();
        initialNotes[booking.id] = booking.provider_notes_internal || '';
      });
      
      setFinalCosts(initialCosts);
      setProviderNotes(initialNotes);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const extractCustomerName = (customerNotes: string | null): string => {
    if (!customerNotes) return 'Unknown Customer';
    const nameMatch = customerNotes.match(/Name:\s*([^,]+)/);
    return nameMatch ? nameMatch[1].trim() : 'Unknown Customer';
  };

  const formatAppointmentDate = (date: string | null, time: string | null): string => {
    if (!date) return 'Unknown Date';
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString();
    return time ? `${formattedDate} at ${time}` : formattedDate;
  };

  const handleFinalCostChange = (bookingId: string, value: string) => {
    setFinalCosts(prev => ({ ...prev, [bookingId]: value }));
  };

  const handleNotesChange = (bookingId: string, value: string) => {
    setProviderNotes(prev => ({ ...prev, [bookingId]: value }));
  };

  const chargeFinalBalance = async (bookingId: string) => {
    const finalCost = parseFloat(finalCosts[bookingId]);
    
    if (isNaN(finalCost) || finalCost < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid final cost",
        variant: "destructive"
      });
      return;
    }

    setProcessing(prev => ({ ...prev, [bookingId]: true }));

    try {
      const { data, error } = await supabase.functions.invoke('charge-final-balance', {
        body: {
          bookingId,
          finalCost,
          providerNotes: providerNotes[bookingId]
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success",
          description: data.finalBalance > 0 
            ? `Successfully charged $${data.finalBalance.toFixed(2)} final balance`
            : "No additional charge needed - service completed",
          variant: "default"
        });

        // Refresh bookings
        await fetchDepositBookings();
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error charging final balance:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process final charge",
        variant: "destructive"
      });
    } finally {
      setProcessing(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Post-Appointment Charging
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading bookings...</div>
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Post-Appointment Charging
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No deposit bookings awaiting final charges</p>
            <p className="text-sm mt-2">Bookings requiring post-appointment pricing will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Post-Appointment Charging
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Set final costs and charge remaining balances for completed appointments
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {bookings.map((booking) => {
          const finalCost = parseFloat(finalCosts[booking.id]) || 0;
          const remainingBalance = Math.max(0, finalCost - booking.deposit_amount);
          
          return (
            <div key={booking.id} className="border rounded-lg p-4 space-y-4">
              {/* Booking Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{booking.service_name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {booking.customer_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {booking.appointment_date}
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  Deposit Paid: ${booking.deposit_amount}
                </Badge>
              </div>

              <Separator />

              {/* Pricing Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Original Estimate</Label>
                  <p className="font-medium">${booking.total_price.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Deposit Paid</Label>
                  <p className="font-medium text-green-600">${booking.deposit_amount.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Remaining Balance</Label>
                  <p className="font-medium text-primary">${remainingBalance.toFixed(2)}</p>
                </div>
              </div>

              {/* Final Cost Input */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor={`final-cost-${booking.id}`} className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Final Service Cost
                  </Label>
                  <Input
                    id={`final-cost-${booking.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={finalCosts[booking.id]}
                    onChange={(e) => handleFinalCostChange(booking.id, e.target.value)}
                    placeholder="Enter final cost"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor={`notes-${booking.id}`}>Provider Notes (Internal)</Label>
                  <Textarea
                    id={`notes-${booking.id}`}
                    value={providerNotes[booking.id]}
                    onChange={(e) => handleNotesChange(booking.id, e.target.value)}
                    placeholder="Optional notes about the final cost..."
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>

              {/* Warning for refunds */}
              {finalCost < booking.deposit_amount && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">Refund Required</p>
                      <p className="text-amber-700">
                        Final cost is less than deposit. Customer should receive a ${(booking.deposit_amount - finalCost).toFixed(2)} refund.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <Button
                onClick={() => chargeFinalBalance(booking.id)}
                disabled={processing[booking.id] || !finalCosts[booking.id]}
                className="w-full"
                variant={remainingBalance <= 0 ? "outline" : "default"}
              >
                {processing[booking.id] ? "Processing..." : 
                 remainingBalance <= 0 ? "Complete Service (No Additional Charge)" : 
                 `Charge Final Balance ($${remainingBalance.toFixed(2)})`}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}