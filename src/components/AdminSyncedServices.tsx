import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SyncedServiceToggle } from '@/components/SyncedServiceToggle';
import { ServiceSelector } from '@/components/ServiceSelector';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Provider {
  id: string;
  business_name: string;
  email: string;
}

interface SyncedService {
  id: string;
  name: string;
  platform: string;
  sync_count: number;
  is_available: boolean;
  offer_on_platform: boolean;
}

export const AdminSyncedServices = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [services, setServices] = useState<SyncedService[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch all providers
  useEffect(() => {
    const fetchProviders = async () => {
      const { data, error } = await supabase
        .from('service_providers')
        .select('id, business_name, email')
        .eq('is_active', true)
        .order('business_name');

      if (error) {
        console.error('Error fetching providers:', error);
        return;
      }

      setProviders(data || []);
    };

    fetchProviders();
  }, []);

  // Fetch services for selected provider
  const fetchServices = async (providerId: string) => {
    if (!providerId) return;
    
    setLoading(true);
    try {
      // Get services with sync counts
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select(`
          id,
          name,
          is_available,
          offer_on_platform,
          sync_source
        `)
        .eq('provider_id', providerId)
        .not('sync_source', 'is', null);

      if (servicesError) throw servicesError;

      // Get sync counts for each service
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

      setServices(servicesWithCounts);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast({
        title: "Error",
        description: "Failed to fetch synced services",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (providerId: string) => {
    setSelectedProviderId(providerId);
    fetchServices(providerId);
  };

  const handleUpdate = () => {
    if (selectedProviderId) {
      fetchServices(selectedProviderId);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Provider Sync Settings</CardTitle>
          <CardDescription>
            Control which synced services from external platforms are offered on Lately for each provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Provider
              </label>
              <Select value={selectedProviderId} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a provider to manage..." />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.business_name} ({provider.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedProviderId && (
        <>
          <ServiceSelector
            providerId={selectedProviderId}
            onUpdate={handleUpdate}
          />
          
          <SyncedServiceToggle
            services={services}
            onUpdate={handleUpdate}
            isAdmin={true}
            providerId={selectedProviderId}
          />
        </>
      )}
    </div>
  );
};