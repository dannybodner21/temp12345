import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, CreditCard, CheckCircle, AlertCircle } from "lucide-react";

interface StripeAccountSyncProps {
  providers: Array<{
    id: string;
    business_name: string;
  }>;
  onSyncComplete?: () => void;
}

interface SyncResult {
  providerId: string;
  success: boolean;
  status?: {
    account_status: string;
    charges_enabled: boolean;
    payouts_enabled: boolean;
  };
  error?: string;
}

export const StripeAccountSync = ({ providers, onSyncComplete }: StripeAccountSyncProps) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const { toast } = useToast();

  const syncAllAccounts = async () => {
    setIsSyncing(true);
    setSyncResults([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-all-stripe-accounts');
      
      if (error) {
        throw error;
      }

      if (data.success) {
        setSyncResults(data.results || []);
        toast({
          title: "Sync Complete",
          description: data.message,
        });
        onSyncComplete?.();
      } else {
        throw new Error(data.error || "Failed to sync accounts");
      }
    } catch (error: any) {
      console.error('Error syncing accounts:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync Stripe accounts",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const syncSingleAccount = async (providerId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-stripe-account-status', {
        body: { providerId }
      });
      
      if (error) {
        throw error;
      }

      if (data.success) {
        // Update the results for this provider
        setSyncResults(prev => {
          const newResults = prev.filter(r => r.providerId !== providerId);
          if (data.hasConnection) {
            newResults.push({
              providerId,
              success: true,
              status: data.status
            });
          }
          return newResults;
        });
        
        toast({
          title: "Account Synced",
          description: data.message,
        });
        onSyncComplete?.();
      } else {
        throw new Error(data.error || "Failed to sync account");
      }
    } catch (error: any) {
      console.error('Error syncing single account:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync Stripe account",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (result: SyncResult) => {
    if (!result.success) {
      return <Badge variant="destructive">Error</Badge>;
    }
    
    if (!result.status) {
      return <Badge variant="secondary">No Connection</Badge>;
    }

    const { account_status, charges_enabled, payouts_enabled } = result.status;
    
    if (charges_enabled && payouts_enabled) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>;
    } else if (account_status === "complete") {
      return <Badge variant="secondary">Setup Required</Badge>;
    } else {
      return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getProviderName = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    return provider?.business_name || "Unknown Provider";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Stripe Account Status Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Sync Stripe account statuses for all providers
          </p>
          <Button 
            onClick={syncAllAccounts} 
            disabled={isSyncing}
            size="sm"
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync All'}
          </Button>
        </div>

        {syncResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Sync Results</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {syncResults.map((result) => (
                <div 
                  key={result.providerId} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">
                      {getProviderName(result.providerId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusBadge(result)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncSingleAccount(result.providerId)}
                      disabled={isSyncing}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};