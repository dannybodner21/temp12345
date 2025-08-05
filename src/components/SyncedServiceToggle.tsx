import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncedService {
  id: string;
  name: string;
  platform: string;
  sync_count: number;
  is_available: boolean;
  offer_on_platform: boolean;
}

interface SyncedServiceToggleProps {
  services: SyncedService[];
  onUpdate: () => void;
  isAdmin?: boolean;
  providerId?: string;
}

export const SyncedServiceToggle = ({ 
  services, 
  onUpdate, 
  isAdmin = false,
  providerId 
}: SyncedServiceToggleProps) => {
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  const handleToggle = async (serviceId: string, newValue: boolean) => {
    setUpdating(serviceId);
    
    try {
      const { error } = await supabase
        .from('services')
        .update({ offer_on_platform: newValue })
        .eq('id', serviceId);

      if (error) throw error;

      toast({
        title: "Service Updated",
        description: `Service ${newValue ? 'enabled' : 'disabled'} on platform`,
      });

      onUpdate();
    } catch (error) {
      console.error('Error updating service:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update service availability",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const getPlatformBadgeColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'square':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'vagaro':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'zenoti':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'boulevard':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  if (!services.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Synced Services</CardTitle>
          <CardDescription>
            No synced services found. Connect a platform and sync appointments to manage service availability.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isAdmin ? 'Manage Synced Services' : 'Service Availability'}
        </CardTitle>
        <CardDescription>
          Control which synced services from external platforms are offered on Lately
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {services.map((service) => (
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
              </div>
              <p className="text-sm text-muted-foreground">
                {service.sync_count} synced appointments
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Label 
                htmlFor={`service-${service.id}`}
                className="text-sm font-medium"
              >
                Offer on Lately
              </Label>
              <Switch
                id={`service-${service.id}`}
                checked={service.offer_on_platform}
                onCheckedChange={(checked) => handleToggle(service.id, checked)}
                disabled={updating === service.id}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};