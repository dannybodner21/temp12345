import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreditCard, Link2, RefreshCw, CheckCircle, Settings, Zap, Key } from "lucide-react";
import { useAppointmentSync } from "@/hooks/useAppointmentSync";
import { ManualTokenEntry } from "./ManualTokenEntry";

export type BookingPlatform = "square" | "vagaro" | "boulevard" | "zenoti" | "setmore";

interface BookingPlatformSelectorProps {
  onConnect: (platform: BookingPlatform) => Promise<void>;
  providerId?: string;
  connections?: Array<{platform: string; is_active: boolean}>;
  isConnecting?: boolean;
}

const PLATFORMS = [
  {
    id: "square" as BookingPlatform,
    name: "Square",
    description: "Accept payments and manage your business with Square",
    icon: CreditCard,
  },
  {
    id: "vagaro" as BookingPlatform,
    name: "Vagaro",
    description: "Connect your Vagaro salon & spa management system",
    icon: Link2,
  },
  {
    id: "boulevard" as BookingPlatform,
    name: "Boulevard",
    description: "Integrate with Boulevard appointment booking platform",
    icon: Link2,
  },
  {
    id: "zenoti" as BookingPlatform,
    name: "Zenoti",
    description: "Connect your Zenoti wellness management system",
    icon: Link2,
  },
  {
    id: "setmore" as BookingPlatform,
    name: "Setmore",
    description: "Connect with Setmore using your partner API credentials",
    icon: Key,
  },
];

export const BookingPlatformSelector = ({ 
  onConnect, 
  providerId,
  connections = [],
  isConnecting = false 
}: BookingPlatformSelectorProps) => {
  const [selectedPlatform, setSelectedPlatform] = useState<BookingPlatform | "">("");
  const [isOpen, setIsOpen] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState(30);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const handleConnect = async () => {
    if (!selectedPlatform) return;
    
    await onConnect(selectedPlatform);
    setIsOpen(false);
    setSelectedPlatform("");
  };

  const handleManualEntrySuccess = () => {
    setShowManualEntry(false);
    setIsOpen(false);
    setSelectedPlatform("");
    // Refresh connections
    window.location.reload();
  };

  const handleManualEntryCancel = () => {
    setShowManualEntry(false);
  };

  const selectedPlatformData = PLATFORMS.find(p => p.id === selectedPlatform);

  // Show connected platforms with sync controls
  const connectedPlatforms = connections.filter(conn => 
    PLATFORMS.some(p => p.id === conn.platform)
  );

  if (connectedPlatforms.length > 0) {
    return (
      <div className="space-y-4">
        {connectedPlatforms.map((connection) => {
          const platform = PLATFORMS.find(p => p.id === connection.platform);
          if (!platform) return null;

          return (
            <ConnectedPlatformCard 
              key={connection.platform}
              platform={platform}
              providerId={providerId!}
              connection={connection}
            />
          );
        })}
        
        {/* Add more platforms button */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Link2 className="mr-2 h-4 w-4" />
              Connect Another Platform
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            {showManualEntry && selectedPlatform && providerId ? (
              <ManualTokenEntry 
                platform={selectedPlatform as BookingPlatform}
                providerId={providerId}
                onSuccess={handleManualEntrySuccess}
                onCancel={handleManualEntryCancel}
              />
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Connect Another Platform</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Select your booking platform
                    </label>
                    <Select value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as BookingPlatform)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a platform..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.filter(p => !connections.some(c => c.platform === p.id)).map((platform) => (
                          <SelectItem key={platform.id} value={platform.id}>
                            <div className="flex items-center gap-2">
                              <platform.icon className="h-4 w-4" />
                              {platform.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedPlatformData && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <selectedPlatformData.icon className="h-4 w-4 text-primary" />
                        <span className="font-medium">{selectedPlatformData.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedPlatformData.description}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Button 
                      onClick={handleConnect} 
                      disabled={!selectedPlatform || isConnecting}
                      className="w-full"
                    >
                      {isConnecting ? "Connecting..." : "Connect with OAuth"}
                    </Button>
                    
                    <Button 
                      onClick={() => setShowManualEntry(true)} 
                      disabled={!selectedPlatform}
                      variant="outline"
                      className="w-full"
                    >
                      <Key className="mr-2 h-4 w-4" />
                      Manual API Credentials Entry
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Try OAuth first. If it doesn't work, use manual entry with your API credentials.
                  </p>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Show initial connection dialog
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Link2 className="mr-2 h-4 w-4" />
          Connect Booking Platform
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        {showManualEntry && selectedPlatform && providerId ? (
          <ManualTokenEntry 
            platform={selectedPlatform as BookingPlatform}
            providerId={providerId}
            onSuccess={handleManualEntrySuccess}
            onCancel={handleManualEntryCancel}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Connect Booking Platform</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select your booking platform
                </label>
                <Select value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as BookingPlatform)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a platform..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((platform) => (
                      <SelectItem key={platform.id} value={platform.id}>
                        <div className="flex items-center gap-2">
                          <platform.icon className="h-4 w-4" />
                          {platform.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPlatformData && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <selectedPlatformData.icon className="h-4 w-4 text-primary" />
                    <span className="font-medium">{selectedPlatformData.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedPlatformData.description}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Button 
                  onClick={handleConnect} 
                  disabled={!selectedPlatform || isConnecting}
                  className="w-full"
                >
                  {isConnecting ? "Connecting..." : "Connect with OAuth"}
                </Button>
                
                <Button 
                  onClick={() => setShowManualEntry(true)} 
                  disabled={!selectedPlatform}
                  variant="outline"
                  className="w-full"
                >
                  <Key className="mr-2 h-4 w-4" />
                  Manual API Credentials Entry
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                Try OAuth first. If it doesn't work, use manual entry with your API credentials.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Connected Platform Card with sync controls
const ConnectedPlatformCard = ({ 
  platform, 
  providerId, 
  connection 
}: { 
  platform: any; 
  providerId: string; 
  connection: any; 
}) => {
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState(30);
  
  const { issyncing, lastSync, syncResult, manualSync } = useAppointmentSync({
    providerId,
    platform: connection.platform,
    autoSync,
    syncInterval
  });

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-green-100 text-green-800">
            Connected
          </Badge>
          <div className="flex items-center gap-2">
            <platform.icon className="h-4 w-4" />
            <span className="font-medium">{platform.name}</span>
          </div>
        </div>
        <Button
          onClick={manualSync}
          disabled={issyncing}
          size="sm"
          variant="outline"
        >
          {issyncing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Auto-sync every {syncInterval} minutes
          </Label>
        </div>
        <Switch
          checked={autoSync}
          onCheckedChange={setAutoSync}
        />
      </div>

      {syncResult && (
        <div className="text-sm text-muted-foreground">
          {syncResult.success ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              Synced {syncResult.synced_count} appointments
            </div>
          ) : (
            <div className="text-red-600">
              Error: {syncResult.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};