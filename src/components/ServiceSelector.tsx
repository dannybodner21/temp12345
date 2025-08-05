import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AvailableService {
  service_name: string;
  platform: string;
  appointment_count: number;
  duration_minutes: number | null;
  total_amount: number | null;
}

interface AddedService {
  id: string;
  name: string;
  platform: string;
  sync_count: number;
  offer_on_platform: boolean;
}

interface WatchedService {
  id: string;
  name: string;
  platform: string;
  duration_minutes: number;
  price: number;
  original_price: number;
}

interface ServiceSelectorProps {
  providerId: string;
  onUpdate: () => void;
}

export const ServiceSelector = ({ providerId, onUpdate }: ServiceSelectorProps) => {
  const [availableServices, setAvailableServices] = useState<AvailableService[]>([]);
  const [addedServices, setAddedServices] = useState<AddedService[]>([]);
  const [watchedServices, setWatchedServices] = useState<WatchedService[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('60');
  const [newServicePrice, setNewServicePrice] = useState('100');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const fetchAvailableServices = async () => {
    setLoading(true);
    try {
      // Get services that exist in synced appointments but not in services table
      const { data: syncedData, error: syncedError } = await supabase
        .from('synced_appointments')
        .select('service_name, platform, duration_minutes, total_amount')
        .eq('provider_id', providerId)
        .not('service_name', 'is', null);

      if (syncedError) throw syncedError;

      // Get existing services
      const { data: existingServices, error: servicesError } = await supabase
        .from('services')
        .select('name, sync_source')
        .eq('provider_id', providerId)
        .not('sync_source', 'is', null);

      if (servicesError) throw servicesError;

      // Filter out services that already exist
      const existingServiceNames = new Set(existingServices?.map(s => s.name) || []);
      
      // Group by service name and aggregate data
      const serviceMap = new Map<string, AvailableService>();
      
      syncedData?.forEach(appointment => {
        if (!appointment.service_name || existingServiceNames.has(appointment.service_name)) return;
        
        const key = appointment.service_name;
        if (serviceMap.has(key)) {
          const existing = serviceMap.get(key)!;
          existing.appointment_count++;
          if (appointment.total_amount) {
            existing.total_amount = appointment.total_amount;
          }
        } else {
          serviceMap.set(key, {
            service_name: appointment.service_name,
            platform: appointment.platform,
            appointment_count: 1,
            duration_minutes: appointment.duration_minutes,
            total_amount: appointment.total_amount
          });
        }
      });

      setAvailableServices(Array.from(serviceMap.values()));
    } catch (error) {
      console.error('Error fetching available services:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available services",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAddedServices = async () => {
    try {
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select(`
          id,
          name,
          offer_on_platform,
          sync_source
        `)
        .eq('provider_id', providerId)
        .not('sync_source', 'is', null);

      if (servicesError) throw servicesError;

      const servicesWithCounts = await Promise.all(
        (servicesData || []).map(async (service) => {
          const { count } = await supabase
            .from('synced_appointments')
            .select('*', { count: 'exact', head: true })
            .eq('provider_id', providerId)
            .eq('service_name', service.name);

          return {
            ...service,
            platform: service.sync_source || 'unknown',
            sync_count: count || 0
          };
        })
      );

      setAddedServices(servicesWithCounts);
    } catch (error) {
      console.error('Error fetching added services:', error);
    }
  };

  const fetchWatchedServices = async () => {
    try {
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select(`
          id,
          name,
          duration_minutes,
          price,
          original_price
        `)
        .eq('provider_id', providerId)
        .is('sync_source', null)
        .eq('offer_on_platform', true);

      if (servicesError) throw servicesError;

      setWatchedServices((servicesData || []).map(service => ({
        ...service,
        platform: 'square' // These are created for Square sync
      })));
    } catch (error) {
      console.error('Error fetching watched services:', error);
    }
  };

  useEffect(() => {
    if (providerId) {
      fetchAvailableServices();
      fetchAddedServices();
      fetchWatchedServices();
    }
  }, [providerId]);

  const handleServiceSelection = (serviceName: string, checked: boolean) => {
    setSelectedServices(prev => 
      checked 
        ? [...prev, serviceName]
        : prev.filter(s => s !== serviceName)
    );
  };

  const addSelectedServices = async () => {
    if (selectedServices.length === 0) return;
    
    setAdding(true);
    try {
      // Get provider details for default settings
      const { data: provider, error: providerError } = await supabase
        .from('service_providers')
        .select('default_discount_percentage, requires_service_approval')
        .eq('id', providerId)
        .single();

      if (providerError) throw providerError;

      // Get appointment data for each selected service
      const servicesToAdd = [];
      for (const serviceName of selectedServices) {
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('synced_appointments')
          .select('duration_minutes, total_amount, platform')
          .eq('provider_id', providerId)
          .eq('service_name', serviceName)
          .limit(1);

        if (appointmentError) throw appointmentError;

        const appointment = appointmentData?.[0];
        if (appointment) {
          const originalPrice = appointment.total_amount || 100;
          const discountPercentage = provider.default_discount_percentage || 0;
          const discountedPrice = originalPrice * (1 - discountPercentage / 100);

          servicesToAdd.push({
            provider_id: providerId,
            name: serviceName,
            duration_minutes: appointment.duration_minutes || 60,
            price: discountedPrice,
            original_price: originalPrice,
            sync_source: appointment.platform,
            offer_on_platform: true,
            is_available: !provider.requires_service_approval
          });
        }
      }

      // Insert services
      const { error: insertError } = await supabase
        .from('services')
        .insert(servicesToAdd);

      if (insertError) throw insertError;

      toast({
        title: "Services Added",
        description: `${selectedServices.length} services added to sync list`,
      });

      setSelectedServices([]);
      fetchAvailableServices();
      fetchAddedServices();
      onUpdate();
    } catch (error) {
      console.error('Error adding services:', error);
      toast({
        title: "Error",
        description: "Failed to add services",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const createWatchedService = async () => {
    if (!newServiceName.trim()) return;
    
    setCreating(true);
    try {
      // Get provider details for default settings
      const { data: provider, error: providerError } = await supabase
        .from('service_providers')
        .select('default_discount_percentage, requires_service_approval')
        .eq('id', providerId)
        .single();

      if (providerError) throw providerError;

      const originalPrice = parseFloat(newServicePrice);
      const discountPercentage = provider.default_discount_percentage || 0;
      const discountedPrice = originalPrice * (1 - discountPercentage / 100);

      const { error: insertError } = await supabase
        .from('services')
        .insert({
          provider_id: providerId,
          name: newServiceName.trim(),
          duration_minutes: parseInt(newServiceDuration),
          price: discountedPrice,
          original_price: originalPrice,
          sync_source: null, // No sync source means it's a watched service
          offer_on_platform: true,
          is_available: !provider.requires_service_approval
        });

      if (insertError) throw insertError;

      toast({
        title: "Watched Service Created",
        description: `"${newServiceName}" will be automatically synced when it appears on Square`,
      });

      setNewServiceName('');
      setNewServiceDuration('60');
      setNewServicePrice('100');
      fetchWatchedServices();
      onUpdate();
    } catch (error) {
      console.error('Error creating watched service:', error);
      toast({
        title: "Error",
        description: "Failed to create watched service",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const removeService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      toast({
        title: "Service Removed",
        description: "Service removed from sync list",
      });

      fetchAvailableServices();
      fetchAddedServices();
      fetchWatchedServices();
      onUpdate();
    } catch (error) {
      console.error('Error removing service:', error);
      toast({
        title: "Error",
        description: "Failed to remove service",
        variant: "destructive",
      });
    }
  };

  const getPlatformBadgeColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'square':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Service to Watch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pre-Create Services to Auto-Sync
          </CardTitle>
          <CardDescription>
            Create services that should be automatically pulled when they appear on the provider's Square calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="service-name">Service Name</Label>
              <Input
                id="service-name"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="e.g., Brow Lamination"
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={newServiceDuration}
                onChange={(e) => setNewServiceDuration(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                value={newServicePrice}
                onChange={(e) => setNewServicePrice(e.target.value)}
              />
            </div>
          </div>
          <Button 
            onClick={createWatchedService}
            disabled={!newServiceName.trim() || creating}
            className="mt-4 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {creating ? 'Creating...' : 'Create Watched Service'}
          </Button>
        </CardContent>
      </Card>

      {/* Watched Services */}
      <Card>
        <CardHeader>
          <CardTitle>Services Waiting to Auto-Sync</CardTitle>
          <CardDescription>
            These services will be automatically synced when they appear on Square
          </CardDescription>
        </CardHeader>
        <CardContent>
          {watchedServices.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No services are set up for auto-sync yet.
            </div>
          ) : (
            <div className="space-y-3">
              {watchedServices.map((service) => (
                <div 
                  key={service.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{service.name}</h4>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        Auto-Sync
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {service.duration_minutes} minutes • ${service.original_price} → ${service.price}
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeService(service.id)}
                    className="flex items-center gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Services to Add */}
      <Card>
        <CardHeader>
          <CardTitle>Available Services from Square</CardTitle>
          <CardDescription>
            Select services from your Square calendar to automatically sync and offer on Lately
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading available services...</div>
          ) : availableServices.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No new services available to add. All Square services are already being synced.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {availableServices.map((service) => (
                  <div 
                    key={service.service_name}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`service-${service.service_name}`}
                        checked={selectedServices.includes(service.service_name)}
                        onCheckedChange={(checked) => 
                          handleServiceSelection(service.service_name, checked as boolean)
                        }
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">{service.service_name}</h4>
                          <Badge className={getPlatformBadgeColor(service.platform)}>
                            {service.platform}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {service.appointment_count} appointments • {service.duration_minutes || 'Unknown'} minutes
                          {service.total_amount && ` • $${service.total_amount}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedServices.length > 0 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    {selectedServices.length} service{selectedServices.length === 1 ? '' : 's'} selected
                  </span>
                  <Button 
                    onClick={addSelectedServices}
                    disabled={adding}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {adding ? 'Adding...' : 'Add to Sync List'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Currently Added Services */}
      <Card>
        <CardHeader>
          <CardTitle>Currently Synced Services</CardTitle>
          <CardDescription>
            Services that are currently being synced from Square and offered on Lately
          </CardDescription>
        </CardHeader>
        <CardContent>
          {addedServices.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No services added to sync list yet.
            </div>
          ) : (
            <div className="space-y-3">
              {addedServices.map((service) => (
                <div 
                  key={service.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{service.name}</h4>
                      <Badge className={getPlatformBadgeColor(service.platform)}>
                        {service.platform}
                      </Badge>
                      {service.offer_on_platform && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {service.sync_count} synced appointments
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeService(service.id)}
                    className="flex items-center gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};