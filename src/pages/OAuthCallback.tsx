import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        toast({
          title: "Connection Failed",
          description: `OAuth error: ${error}`,
          variant: "destructive",
        });
        navigate('/provider-dashboard');
        return;
      }

      if (!code || !state) {
        toast({
          title: "Connection Failed",
          description: "Missing authorization code or state parameter",
          variant: "destructive",
        });
        navigate('/provider-dashboard');
        return;
      }

      try {
        console.log('Processing OAuth callback with code:', code);
        
        // Parse the state to get provider_id and platform
        const stateData = JSON.parse(decodeURIComponent(state));
        const { provider_id, platform } = stateData;

        // Call the edge function to complete the OAuth flow
        const { data, error: callbackError } = await supabase.functions.invoke('booking-platform-oauth', {
          body: {
            provider_id,
            platform,
            action: 'callback',
            code,
            state
          }
        });

        if (callbackError) {
          console.error('Callback error:', callbackError);
          toast({
            title: "Connection Failed",
            description: `Failed to complete ${platform} connection: ${callbackError.message}`,
            variant: "destructive",
          });
        } else {
          console.log('OAuth callback successful:', data);
          toast({
            title: "Connection Successful",
            description: `Successfully connected to ${platform}!`,
          });
        }
      } catch (error) {
        console.error('Error processing OAuth callback:', error);
        toast({
          title: "Connection Failed",
          description: "An error occurred while processing the OAuth callback",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
        // Redirect to provider dashboard after a short delay
        setTimeout(() => {
          navigate('/provider-dashboard');
        }, 2000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <h1 className="text-2xl font-semibold">Processing Connection...</h1>
        <p className="text-muted-foreground">
          {isProcessing 
            ? "We're completing your platform connection. Please wait..."
            : "Redirecting you back to the dashboard..."
          }
        </p>
      </div>
    </div>
  );
};

export default OAuthCallback;