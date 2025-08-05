import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Calendar,
  Settings,
  Zap
} from 'lucide-react';
import { useAppointmentSync } from '@/hooks/useAppointmentSync';
import { format } from 'date-fns';

interface ServiceSyncManagerProps {
  providerId: string;
  platform: 'square' | 'vagaro' | 'zenoti' | 'boulevard';
  platformName: string;
  isConnected: boolean;
}

export const ServiceSyncManager = ({ 
  providerId, 
  platform, 
  platformName, 
  isConnected 
}: ServiceSyncManagerProps) => {
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState(30);
  
  const { issyncing, lastSync, syncResult, manualSync } = useAppointmentSync({
    providerId,
    platform,
    autoSync,
    syncInterval
  });

  const getPlatformBadgeColor = (platform: string) => {
    switch (platform) {
      case 'square':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'vagaro':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'zenoti':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'boulevard':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    if (issyncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (syncResult?.success) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (syncResult?.error) return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  const getStatusText = () => {
    if (issyncing) return 'Syncing...';
    if (syncResult?.success) return `Last sync: ${syncResult.synced_count} appointments`;
    if (syncResult?.error) return `Error: ${syncResult.error}`;
    return 'Not synced yet';
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Service Sync - {platformName}
          </CardTitle>
          <CardDescription>
            Automatically sync your {platformName} appointments to show as available services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Connect your {platformName} account first to enable automatic syncing
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Service Sync - {platformName}
        </CardTitle>
        <CardDescription>
          Automatically sync your {platformName} appointments to show as available services
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Platform Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={getPlatformBadgeColor(platform)}>
              {platformName}
            </Badge>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm text-muted-foreground">
                {getStatusText()}
              </span>
            </div>
          </div>
          <Button
            onClick={manualSync}
            disabled={issyncing}
            size="sm"
            variant="outline"
          >
            {issyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Now
          </Button>
        </div>

        {lastSync && (
          <div className="text-sm text-muted-foreground">
            Last synced: {format(lastSync, 'PPp')}
          </div>
        )}

        <Separator />

        {/* Auto Sync Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-sync" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Automatic Sync
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically sync appointments every {syncInterval} minutes
              </p>
            </div>
            <Switch
              id="auto-sync"
              checked={autoSync}
              onCheckedChange={setAutoSync}
            />
          </div>

          {autoSync && (
            <div className="space-y-2">
              <Label htmlFor="sync-interval" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Sync Interval
              </Label>
              <Select
                value={syncInterval.toString()}
                onValueChange={(value) => setSyncInterval(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every hour</SelectItem>
                  <SelectItem value="120">Every 2 hours</SelectItem>
                  <SelectItem value="240">Every 4 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Sync Result */}
        {syncResult && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium">Sync Status</h4>
              {syncResult.success ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Successfully synced {syncResult.synced_count} appointments
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Sync failed: {syncResult.error}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* How it works */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">How it works:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Syncs available appointments from {platformName}</li>
            <li>• Creates services automatically based on appointment types</li>
            <li>• Shows today's available slots in "Today's Services"</li>
            <li>• Updates in real-time when appointments change</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};