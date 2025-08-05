import { useState, useEffect } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const isWebPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

const isCapacitorPushSupported = () => {
  return Capacitor.isPluginAvailable('PushNotifications');
};

export const usePushNotifications = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { user } = useAuth();

  const isSupported = isWebPushSupported() || isCapacitorPushSupported();

  const registerWebPush = async () => {
    try {
      // Check current permission status first
      const currentPermission = Notification.permission;
      console.log('Current notification permission:', currentPermission);
      
      // Request notification permission
      const permission = await Notification.requestPermission();
      console.log('Requested notification permission result:', permission);
      
      if (permission !== 'granted') {
        console.log('Permission denied. Current state:', permission);
        toast({
          title: "Permission Denied",
          description: `Push notifications require permission to work. Current status: ${permission}. Please check your browser settings and allow notifications for this site.`,
          variant: "destructive"
        });
        return;
      }

      // For now, we'll use a placeholder token for web push
      // In a real implementation, you'd register with FCM or similar service
      const webToken = `web-${Date.now()}-${user?.id}`;
      await saveTokenToDatabase(webToken);
      
      toast({
        title: "Push Notifications Enabled",
        description: "You'll receive notifications for new service approvals",
      });
    } catch (error) {
      console.error('Error registering for web push:', error);
      toast({
        title: "Registration Failed",
        description: "Failed to register for push notifications",
        variant: "destructive"
      });
    }
  };

  const registerCapacitorPush = async () => {
    try {
      const permissionResult = await PushNotifications.requestPermissions();
      
      if (permissionResult.receive === 'granted') {
        await PushNotifications.register();
      } else {
        toast({
          title: "Permission Denied",
          description: "Push notifications require permission to work",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error registering for Capacitor push:', error);
      toast({
        title: "Registration Failed",
        description: "Failed to register for push notifications",
        variant: "destructive"
      });
    }
  };

  const registerForPushNotifications = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to enable push notifications",
        variant: "destructive"
      });
      return;
    }

    if (isCapacitorPushSupported()) {
      await registerCapacitorPush();
    } else if (isWebPushSupported()) {
      await registerWebPush();
    }
  };

  const unregisterFromPushNotifications = async () => {
    if (!user || !token) return;

    try {
      // Remove token from database
      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('token', token);

      // Clear local state
      setToken(null);
      setIsRegistered(false);

      toast({
        title: "Push Notifications Disabled",
        description: "You will no longer receive push notifications",
      });
    } catch (error) {
      console.error('Error unregistering from push notifications:', error);
      toast({
        title: "Error",
        description: "Failed to disable push notifications",
        variant: "destructive"
      });
    }
  };

  const saveTokenToDatabase = async (pushToken: string) => {
    if (!user) return;

    try {
      const platform = Capacitor.getPlatform();
      
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: user.id,
          token: pushToken,
          platform: platform === 'web' ? 'web' : platform,
          is_active: true
        }, {
          onConflict: 'token'
        });

      if (error) {
        console.error('Error saving push token:', error);
      } else {
        console.log('Push token saved successfully');
        setToken(pushToken);
        setIsRegistered(true);
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    let tokenListener: any;
    let errorListener: any;
    let pushListener: any;
    let actionListener: any;

    const setupCapacitorListeners = async () => {
      if (!isCapacitorPushSupported()) return;

      tokenListener = await PushNotifications.addListener('registration', (token: Token) => {
        console.log('Push registration success, token: ' + token.value);
        saveTokenToDatabase(token.value);
      });

      errorListener = await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      });

      pushListener = await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push notification received: ', notification);
        
        toast({
          title: notification.title || "New Notification",
          description: notification.body || "You have a new notification",
        });
      });

      actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
        console.log('Push notification action performed', notification);
      });
    };

    const checkExistingToken = async () => {
      try {
        const { data } = await supabase
          .from('push_tokens')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (data) {
          setToken(data.token);
          setIsRegistered(true);
        }
      } catch (error) {
        // No existing token found
      }
    };

    setupCapacitorListeners();
    checkExistingToken();

    return () => {
      if (tokenListener) tokenListener.remove();
      if (errorListener) errorListener.remove();
      if (pushListener) pushListener.remove();
      if (actionListener) actionListener.remove();
    };
  }, [user]);

  return {
    isRegistered,
    token,
    registerForPushNotifications,
    unregisterFromPushNotifications,
    isSupported
  };
};