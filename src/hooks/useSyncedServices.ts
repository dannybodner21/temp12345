import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SyncedService {
  id: string;
  name: string;
  platform: string;
  sync_count: number;
  is_available: boolean;
  offer_on_platform: boolean;
}

export const useSyncedServices = (providerId: string) => {
  const [services, setServices] = useState<SyncedService[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSyncedServices = async () => {
    if (!providerId) return;
    
    setLoading(true);
    try {
      // Get services with sync sources
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
      console.error('Error fetching synced services:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncedServices();
  }, [providerId]);

  return {
    services,
    loading,
    refetch: fetchSyncedServices
  };
};