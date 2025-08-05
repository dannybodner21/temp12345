import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncOptions {
  providerId: string;
  platform: 'square' | 'vagaro' | 'zenoti' | 'boulevard';
  autoSync?: boolean;
  syncInterval?: number; // in minutes
}

interface SyncResult {
  success: boolean;
  synced_count: number;
  error?: string;
}

export const useAppointmentSync = ({ 
  providerId, 
  platform, 
  autoSync = false, 
  syncInterval = 5 // Sync every 5 minutes instead of 30 
}: SyncOptions) => {
  const [issyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const { toast } = useToast();

  const performSync = async (showToast = true): Promise<SyncResult> => {
    setIsSyncing(true);
    
    try {
      console.log(`Starting ${platform} sync for provider ${providerId}`);
      
      const { data, error } = await supabase.functions.invoke('sync-schedule', {
        body: {
          provider_id: providerId,
          platform: platform,
          sync_type: 'incremental'
        }
      });

      if (error) {
        console.error(`${platform} sync error:`, error);
        const result = { success: false, synced_count: 0, error: error.message };
        setSyncResult(result);
        
        if (showToast) {
          toast({
            title: "Sync Error",
            description: `Failed to sync ${platform} appointments: ${error.message}`,
            variant: "destructive",
          });
        }
        
        return result;
      }

      const result = { success: true, synced_count: data.synced_count };
      setSyncResult(result);
      setLastSync(new Date());
      
      if (showToast && data.synced_count > 0) {
        toast({
          title: "Sync Complete",
          description: `Synced ${data.synced_count} appointments from ${platform}`,
        });
      }
      
      console.log(`${platform} sync complete:`, result);
      return result;
      
    } catch (error) {
      console.error(`${platform} sync error:`, error);
      const result = { success: false, synced_count: 0, error: 'Sync failed' };
      setSyncResult(result);
      
      if (showToast) {
        toast({
          title: "Sync Error",
          description: `Failed to sync ${platform} appointments`,
          variant: "destructive",
        });
      }
      
      return result;
    } finally {
      setIsSyncing(false);
    }
  };

  const manualSync = () => performSync(true);

  // Setup automatic sync
  useEffect(() => {
    if (!autoSync || !providerId) return;

    const intervalId = setInterval(() => {
      performSync(false); // Don't show toast for automatic syncs
    }, syncInterval * 60 * 1000); // Convert minutes to milliseconds

    // Perform initial sync
    performSync(false);

    return () => clearInterval(intervalId);
  }, [autoSync, providerId, platform, syncInterval]);

  // Listen for realtime changes to synced appointments
  useEffect(() => {
    if (!providerId) return;

    const channel = supabase
      .channel('synced_appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'synced_appointments',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('Synced appointments change:', payload);
          // Optionally trigger a re-sync or update UI
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [providerId]);

  return {
    issyncing,
    lastSync,
    syncResult,
    manualSync,
    performSync
  };
};