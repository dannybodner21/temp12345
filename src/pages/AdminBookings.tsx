import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, CreditCard, DollarSign, User, MapPin, Phone, Mail, Users, BookOpen, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PostAppointmentCharging from "@/components/PostAppointmentCharging";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Booking {
  id: string;
  user_id: string;
  service_id: string;
  time_slot_id: string;
  total_price: number;
  booking_date: string;
  status: string;
  customer_notes: string | null;
  provider_notes: string | null;
  deposit_amount: number | null;
  final_cost: number | null;
  deposit_paid: boolean;
  final_payment_status: string;
  service: {
    id: string;
    name: string;
    description: string | null;
    provider_id: string;
    allows_post_appointment_adjustment: boolean;
  };
  time_slot: {
    date: string;
    start_time: string;
    end_time: string;
  };
  provider: {
    id: string;
    business_name: string;
    email: string | null;
    phone: string | null;
    address: string;
    city: string;
    state: string;
  };
}

interface Provider {
  id: string;
  business_name: string;
}

const AdminBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [providerNotes, setProviderNotes] = useState("");
  const [finalCost, setFinalCost] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookings();
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('id, business_name')
        .eq('is_active', true)
        .order('business_name');

      if (error) throw error;
      setProviders(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch providers",
        variant: "destructive",
      });
    }
  };

  const fetchBookings = async () => {
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          service:services(
            id,
            name,
            description,
            provider_id,
            allows_post_appointment_adjustment
          ),
          time_slot:time_slots(
            date,
            start_time,
            end_time
          )
        `)
        .order('booking_date', { ascending: false });

      if (selectedProvider !== "all") {
        query = query.eq('service.provider_id', selectedProvider);
      }

      const { data: bookingsData, error } = await query;

      if (error) throw error;

      // Fetch provider details separately for each booking
      const bookingsWithProviders = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          const { data: providerData } = await supabase
            .from('service_providers')
            .select('id, business_name, email, phone, address, city, state')
            .eq('id', booking.service.provider_id)
            .single();

          return {
            ...booking,
            provider: providerData || {
              id: '',
              business_name: 'Unknown',
              email: null,
              phone: null,
              address: '',
              city: '',
              state: ''
            }
          };
        })
      );

      setBookings(bookingsWithProviders as Booking[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchBookings();
    }
  }, [selectedProvider]);

  const getStatusBadge = (booking: Booking) => {
    if (booking.status === 'confirmed') {
      if (booking.deposit_paid && booking.final_payment_status === 'pending') {
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Awaiting Final Payment</Badge>;
      }
      if (booking.deposit_paid && booking.final_payment_status === 'completed') {
        return <Badge variant="default" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      }
      if (booking.deposit_paid) {
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Deposit Paid</Badge>;
      }
      return <Badge variant="default">Confirmed</Badge>;
    }
    if (booking.status === 'pending_payment') {
      return <Badge variant="outline">Pending Payment</Badge>;
    }
    return <Badge variant="secondary">{booking.status}</Badge>;
  };

  const extractCustomerInfo = (customerNotes: string | null) => {
    if (!customerNotes) return { name: 'Unknown', email: '', phone: '', zip: '' };
    
    const nameMatch = customerNotes.match(/Name:\s*([^,]+)/);
    const emailMatch = customerNotes.match(/Email:\s*([^,]+)/);
    const phoneMatch = customerNotes.match(/Phone:\s*([^,]+)/);
    const zipMatch = customerNotes.match(/Zip:\s*([^,]+)/);
    
    return {
      name: nameMatch ? nameMatch[1].trim() : 'Unknown',
      email: emailMatch ? emailMatch[1].trim() : '',
      phone: phoneMatch ? phoneMatch[1].trim() : '',
      zip: zipMatch ? zipMatch[1].trim() : ''
    };
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setProviderNotes(booking.provider_notes || '');
    setFinalCost(booking.final_cost?.toString() || booking.total_price.toString());
    setIsEditDialogOpen(true);
  };

  const handleSaveBooking = async () => {
    if (!editingBooking) return;

    try {
      const updates: any = {
        provider_notes: providerNotes,
      };

      if (editingBooking.service.allows_post_appointment_adjustment) {
        updates.final_cost = parseFloat(finalCost);
      }

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', editingBooking.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Booking updated successfully",
      });

      setIsEditDialogOpen(false);
      setEditingBooking(null);
      fetchBookings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update booking",
        variant: "destructive",
      });
    }
  };

  const regularBookings = bookings.filter(b => !b.service.allows_post_appointment_adjustment);
  const depositBookings = bookings.filter(b => b.service.allows_post_appointment_adjustment);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Loading bookings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Navigation */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-semibold">Admin Dashboard</h2>
            <nav className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/providers')}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Providers
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/admin/bookings')}
                className="flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Bookings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/sync-settings')}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Sync Settings
              </Button>
            </nav>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Admin Bookings</h1>
          </div>
        </div>

      {/* Provider Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="w-full max-w-md p-2 border rounded-md"
          >
            <option value="all">All Providers</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.business_name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Tabs defaultValue="regular" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 h-auto p-1">
          <TabsTrigger 
            value="regular" 
            className="text-xs sm:text-sm px-2 py-3 whitespace-nowrap overflow-hidden text-ellipsis"
          >
            <span className="hidden sm:inline">Regular Bookings</span>
            <span className="sm:hidden">Regular</span>
            <span className="ml-1">({regularBookings.length})</span>
          </TabsTrigger>
          <TabsTrigger 
            value="deposit" 
            className="text-xs sm:text-sm px-2 py-3 whitespace-nowrap overflow-hidden text-ellipsis"
          >
            <span className="hidden sm:inline">Post-Appointment</span>
            <span className="sm:hidden">Deposit</span>
            <span className="ml-1">({depositBookings.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="regular" className="space-y-4 mt-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Standard Service Bookings</h3>
            <p className="text-sm text-muted-foreground">
              All confirmed bookings with fixed pricing - no post-appointment adjustments needed.
            </p>
          </div>
          
          {regularBookings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No regular bookings found</p>
              </CardContent>
            </Card>
          ) : (
            regularBookings.map((booking) => {
              const customer = extractCustomerInfo(booking.customer_notes);
              return (
                <Card key={booking.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{booking.service.name}</h3>
                        <p className="text-sm text-muted-foreground">{booking.provider.business_name}</p>
                      </div>
                      {getStatusBadge(booking)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4" />
                          <span>{customer.name}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(booking.time_slot.date).toLocaleDateString()} at {booking.time_slot.start_time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4" />
                          <span>${booking.total_price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4" />
                          <span>{booking.provider.city}, {booking.provider.state}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditBooking(booking)}
                      >
                        Edit Booking
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="deposit" className="space-y-4 mt-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Deposit Services - Final Charging</h3>
            <p className="text-sm text-muted-foreground">
              Services that allow final cost adjustments after the appointment is completed. Manage final charges for customers who paid deposits.
            </p>
          </div>
          
          {depositBookings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No deposit bookings found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {providers
                .filter(provider => 
                  selectedProvider === "all" || provider.id === selectedProvider
                )
                .map(provider => (
                  <div key={provider.id}>
                    <h3 className="text-lg font-semibold mb-4">{provider.business_name}</h3>
                    <PostAppointmentCharging providerId={provider.id} />
                  </div>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Booking Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="provider-notes">Provider Notes</Label>
              <Textarea
                id="provider-notes"
                value={providerNotes}
                onChange={(e) => setProviderNotes(e.target.value)}
                placeholder="Add internal notes..."
                rows={3}
              />
            </div>
            
            {editingBooking?.service.allows_post_appointment_adjustment && (
              <div>
                <Label htmlFor="final-cost">Final Cost</Label>
                <Input
                  id="final-cost"
                  type="number"
                  step="0.01"
                  value={finalCost}
                  onChange={(e) => setFinalCost(e.target.value)}
                  placeholder="Enter final cost"
                />
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveBooking} className="flex-1">
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default AdminBookings;