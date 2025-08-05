import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, User, DollarSign, RefreshCw, RotateCw, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAIServiceCategorization } from "@/hooks/useAIServiceCategorization";
import { format } from "date-fns";

interface SyncedAppointment {
  id: string;
  platform: 'square' | 'vagaro' | 'boulevard' | 'zenoti' | 'setmore';
  platform_appointment_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  service_name?: string;
  appointment_date: string;
  duration_minutes?: number;
  status: string;
  total_amount?: number;
  notes?: string;
  platform_specific_data: any;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

interface SyncedAppointmentsProps {
  providerId: string;
}

export const SyncedAppointments = ({ providerId }: SyncedAppointmentsProps) => {
  const [appointments, setAppointments] = useState<SyncedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [categorizingAppointments, setCategorizingAppointments] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { categorizeService } = useAIServiceCategorization();

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('synced_appointments')
        .select('*')
        .eq('provider_id', providerId)
        .order('appointment_date', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
        toast({
          title: "Error",
          description: "Failed to fetch appointments",
          variant: "destructive",
        });
        return;
      }

      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch appointments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncSchedule = async (platform: 'square' | 'vagaro' | 'boulevard' | 'setmore') => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-schedule', {
        body: {
          provider_id: providerId,
          platform: platform,
          sync_type: 'full'
        }
      });

      if (error) {
        console.error('Sync error:', error);
        toast({
          title: "Sync Error",
          description: error.message || "Failed to sync schedule",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sync Complete",
        description: `Synced ${data.synced_count} appointments from ${platform}`,
      });

      // Refresh appointments after sync
      await fetchAppointments();
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Error",
        description: "Failed to sync schedule",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const toggleAvailability = async (appointmentId: string, currentAvailability: boolean) => {
    try {
      const { error } = await supabase
        .from('synced_appointments')
        .update({ is_available: !currentAvailability })
        .eq('id', appointmentId);

      if (error) {
        console.error('Error updating availability:', error);
        toast({
          title: "Error",
          description: "Failed to update appointment availability",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setAppointments(prevAppointments =>
        prevAppointments.map(appointment =>
          appointment.id === appointmentId
            ? { ...appointment, is_available: !currentAvailability }
            : appointment
        )
      );

      toast({
        title: "Updated",
        description: `Appointment ${!currentAvailability ? 'enabled' : 'disabled'} on platform`,
      });
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment availability",
        variant: "destructive",
      });
    }
  };

  const getPlatformBadgeColor = (platform: string) => {
    switch (platform) {
      case 'square':
        return 'bg-blue-100 text-blue-800';
      case 'vagaro':
        return 'bg-purple-100 text-purple-800';
      case 'boulevard':
        return 'bg-green-100 text-green-800';
      case 'setmore':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCategorizeAppointment = async (appointment: SyncedAppointment) => {
    if (!appointment.service_name) {
      toast({
        title: "No service name",
        description: "This appointment doesn't have a service name to categorize.",
        variant: "destructive"
      });
      return;
    }

    setCategorizingAppointments(prev => new Set(prev).add(appointment.id));

    try {
      const result = await categorizeService(appointment.service_name, appointment.notes);
      if (result) {
        toast({
          title: "Service categorized",
          description: `"${appointment.service_name}" was categorized as "${result.categoryName}"`,
        });
      }
    } finally {
      setCategorizingAppointments(prev => {
        const newSet = new Set(prev);
        newSet.delete(appointment.id);
        return newSet;
      });
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [providerId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="animate-spin h-6 w-6 mr-2" />
            Loading appointments...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Synced Appointments
            </CardTitle>
            <Button 
              onClick={() => syncSchedule('square')} 
              disabled={syncing}
              size="sm"
              className="flex items-center gap-2"
            >
              {syncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="h-4 w-4" />
              )}
              Sync Square
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No synced appointments found.</p>
              <p className="text-sm mt-2">Click "Sync Square" to import your appointments.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className={`border rounded-lg p-4 hover:bg-accent/50 transition-colors ${
                    !appointment.is_available ? 'opacity-50 bg-muted/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={getPlatformBadgeColor(appointment.platform)}>
                        {appointment.platform}
                      </Badge>
                      <Badge className={getStatusBadgeColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`availability-${appointment.id}`}
                          checked={appointment.is_available}
                          onCheckedChange={() => toggleAvailability(appointment.id, appointment.is_available)}
                        />
                        <label 
                          htmlFor={`availability-${appointment.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          Available on platform
                        </label>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ID: {appointment.platform_appointment_id}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {appointment.customer_name || 'Unknown Customer'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(new Date(appointment.appointment_date), 'PPP')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(new Date(appointment.appointment_date), 'p')}
                          {appointment.duration_minutes && ` (${appointment.duration_minutes} min)`}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">Service:</span> {appointment.service_name || 'N/A'}
                        </div>
                        {appointment.service_name && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCategorizeAppointment(appointment)}
                            disabled={categorizingAppointments.has(appointment.id)}
                            className="h-7 px-2 text-xs"
                          >
                            {categorizingAppointments.has(appointment.id) ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1" />
                                Categorizing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI Categorize
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      
                      {appointment.total_amount && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>${appointment.total_amount.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {appointment.notes && (
                        <div>
                          <span className="font-medium">Notes:</span> {appointment.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};