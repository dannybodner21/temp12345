import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock, Calendar, Plus } from "lucide-react";
import { getTodayInPacific, formatDateInPacific } from "@/lib/timezone";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
}

interface ManualAvailabilityInputProps {
  providerId: string;
  onSuccess?: () => void;
}

export const ManualAvailabilityInput = ({ providerId, onSuccess }: ManualAvailabilityInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState({
    start_time: "",
    duration_minutes: "60"
  });
  const { toast } = useToast();
  const todayDate = getTodayInPacific();

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, duration_minutes")
        .eq("provider_id", providerId)
        .eq("is_available", true)
        .order("name");

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast({
        title: "Error",
        description: "Failed to fetch services",
        variant: "destructive",
      });
    }
  };

  const handleOpenDialog = () => {
    setIsOpen(true);
    fetchServices();
  };

  const createTimeSlots = async () => {
    if (!form.start_time || !form.duration_minutes) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const availableDurationMinutes = parseInt(form.duration_minutes);
      
      // Find services that fit within the available duration
      const fittingServices = services.filter(service => 
        service.duration_minutes <= availableDurationMinutes
      );

      if (fittingServices.length === 0) {
        toast({
          title: "No Services Found",
          description: `No services found that fit within ${availableDurationMinutes} minutes`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Create time slots for each fitting service
      const timeSlots = fittingServices.map(service => {
        // Calculate end time based on service duration
        const [hours, minutes] = form.start_time.split(':').map(Number);
        const startTimeInMinutes = hours * 60 + minutes;
        const endTimeInMinutes = startTimeInMinutes + service.duration_minutes;
        
        // Handle times that go past midnight (24+ hours)
        let endHours = Math.floor(endTimeInMinutes / 60);
        const endMins = endTimeInMinutes % 60;
        
        // If end time goes past midnight, wrap it to next day format (24+ hour format is valid in PostgreSQL time fields)
        // PostgreSQL time type supports 24:00:00 and beyond for same-day durations
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;

        return {
          service_id: service.id,
          date: todayDate,
          start_time: `${form.start_time}:00`,
          end_time: endTime,
          is_available: true
        };
      });

      const { error } = await supabase
        .from("time_slots")
        .insert(timeSlots);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Created ${timeSlots.length} time slots for services that fit within ${availableDurationMinutes} minutes`,
      });

      // Reset form and close dialog
      setForm({
        start_time: "",
        duration_minutes: "60"
      });
      setIsOpen(false);
      onSuccess?.();

    } catch (error) {
      console.error("Error creating time slots:", error);
      toast({
        title: "Error",
        description: "Failed to create time slots",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={handleOpenDialog} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Quick Bulk Availability
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Same-Day Availability</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-accent/50 p-3 rounded-lg">
            <p className="text-sm font-medium">Date: Today ({formatDateInPacific(new Date())})</p>
            <p className="text-xs text-muted-foreground">Same-day services only</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_time">Start Time</Label>
            <Input
              id="start_time"
              type="time"
              value={form.start_time}
              onChange={(e) => setForm(prev => ({ ...prev, start_time: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Available Duration</Label>
            <Select
              value={form.duration_minutes}
              onValueChange={(value) => setForm(prev => ({ ...prev, duration_minutes: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="150">2.5 hours</SelectItem>
                <SelectItem value="180">3 hours</SelectItem>
                <SelectItem value="240">4 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {services.length > 0 && form.duration_minutes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Services available today:</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {services
                  .filter(service => service.duration_minutes <= parseInt(form.duration_minutes))
                  .map(service => (
                    <div key={service.id} className="flex items-center justify-between text-sm">
                      <span>{service.name}</span>
                      <span className="text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {service.duration_minutes}min
                      </span>
                    </div>
                  ))}
                {services.filter(service => service.duration_minutes <= parseInt(form.duration_minutes)).length === 0 && (
                  <p className="text-sm text-muted-foreground">No services fit within this duration</p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={createTimeSlots}
              disabled={isLoading || !form.start_time}
              className="flex-1"
            >
              {isLoading ? "Creating..." : "Create Time Slots"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};