import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const SquareOAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state'); // This is the provider_id
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        navigate('/provider-dashboard?error=oauth_denied');
        return;
      }

      if (!code || !state) {
        console.error('Missing code or state in callback');
        navigate('/provider-dashboard?error=missing_parameters');
        return;
      }

      try {
        console.log('Processing Square OAuth callback with code:', code, 'and state:', state);
        
        // Call the edge function to handle the callback
        const { data, error: functionError } = await supabase.functions.invoke('booking-platform-oauth', {
          body: {
            provider_id: state,
            platform: 'square',
            action: 'callback',
            code: code,
            state: state
          }
        });

        if (functionError) {
          console.error('Error calling OAuth function:', functionError);
          navigate('/provider-dashboard?error=function_error');
          return;
        }

        console.log('OAuth callback processed successfully');
        navigate('/provider-dashboard?connected=square');
      } catch (error) {
        console.error('Exception during OAuth callback:', error);
        navigate('/provider-dashboard?error=callback_failed');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <h2 className="text-lg font-semibold">Connecting your Square account...</h2>
        <p className="text-muted-foreground">Please wait while we complete the setup.</p>
      </div>
    </div>
  );
};

export default SquareOAuthCallback;