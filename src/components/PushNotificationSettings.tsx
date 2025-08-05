import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Smartphone } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const PushNotificationSettings = () => {
  const { user } = useAuth();
  const { isRegistered, registerForPushNotifications, unregisterFromPushNotifications, isSupported } = usePushNotifications();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load current push notification preference
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from('service_providers')
          .select('push_notifications_enabled')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setPushEnabled(data.push_notifications_enabled);
        }
      } catch (error) {
        console.error('Error loading push notification preferences:', error);
      }
    };

    loadPreferences();
  }, [user]);

  const handleTogglePushNotifications = async (enabled: boolean) => {
    if (!user) return;

    setLoading(true);
    try {
      // Update preference in database
      const { error } = await supabase
        .from('service_providers')
        .update({ push_notifications_enabled: enabled })
        .eq('user_id', user.id);

      if (error) throw error;

      setPushEnabled(enabled);

      if (enabled && !isRegistered) {
        // Register for push notifications
        await registerForPushNotifications();
      } else if (!enabled && isRegistered) {
        // Unregister from push notifications
        await unregisterFromPushNotifications();
      }

      toast({
        title: enabled ? "Push Notifications Enabled" : "Push Notifications Disabled",
        description: enabled 
          ? "You'll receive push notifications for service approvals and bookings" 
          : "Push notifications have been disabled",
      });
    } catch (error) {
      console.error('Error updating push notification preference:', error);
      toast({
        title: "Error",
        description: "Failed to update push notification settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported on this platform
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get instant notifications when new services require approval and when clients book a service
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Enable Push Notifications</p>
            <p className="text-sm text-muted-foreground">
              Receive notifications directly in the Lately app
            </p>
          </div>
          <Switch
            checked={pushEnabled}
            onCheckedChange={handleTogglePushNotifications}
            disabled={loading}
          />
        </div>

        {pushEnabled && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Smartphone className="h-4 w-4 text-primary" />
            <div className="text-sm">
              {isRegistered ? (
                <span className="text-green-600">✓ Push notifications are active</span>
              ) : (
                <span className="text-amber-600">⚠ Waiting for permission...</span>
              )}
            </div>
          </div>
        )}

        {pushEnabled && !isRegistered && (
          <Button 
            onClick={registerForPushNotifications}
            disabled={loading}
            className="w-full"
          >
            Enable Push Notifications
          </Button>
        )}
      </CardContent>
    </Card>
  );
};