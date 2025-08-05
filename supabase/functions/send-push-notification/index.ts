import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushNotificationPayload {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, title, body, data }: PushNotificationPayload = await req.json();

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's push tokens
    const { data: tokens, error: tokensError } = await supabaseClient
      .from('push_tokens')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log('No active push tokens found for user:', user_id);
      return new Response(
        JSON.stringify({ message: 'No active push tokens found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    // Send push notification to each token
    for (const tokenRecord of tokens) {
      try {
        let pushResponse;
        
        if (tokenRecord.platform === 'web') {
          // For web push notifications, you would typically use a service like FCM
          // This is a placeholder for web push implementation
          console.log('Web push notification would be sent to:', tokenRecord.token);
          pushResponse = { success: true, platform: 'web' };
        } else {
          // For mobile platforms (iOS/Android), you would use FCM or similar service
          // This is a placeholder for mobile push implementation
          console.log(`${tokenRecord.platform} push notification would be sent to:`, tokenRecord.token);
          pushResponse = { success: true, platform: tokenRecord.platform };
        }

        results.push({
          token: tokenRecord.token,
          platform: tokenRecord.platform,
          success: pushResponse.success
        });

      } catch (tokenError) {
        console.error(`Error sending push notification to token ${tokenRecord.token}:`, tokenError);
        results.push({
          token: tokenRecord.token,
          platform: tokenRecord.platform,
          success: false,
          error: tokenError.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Push notification results: ${successCount} successful, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        message: 'Push notification processing completed',
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in send-push-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});