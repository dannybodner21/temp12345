import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BookingNotificationPayload {
  booking_id: string;
  service_name: string;
  customer_name: string;
  booking_date: string;
  provider_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      booking_id, 
      service_name, 
      customer_name, 
      booking_date, 
      provider_id 
    }: BookingNotificationPayload = await req.json();

    console.log('Processing booking notification for:', { booking_id, service_name, customer_name, provider_id });

    if (!booking_id || !service_name || !customer_name || !provider_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get provider information and check if push notifications are enabled
    const { data: provider, error: providerError } = await supabase
      .from('service_providers')
      .select('business_name, push_notifications_enabled, user_id')
      .eq('id', provider_id)
      .single();

    if (providerError) {
      console.error('Error fetching provider:', providerError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch provider information' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!provider) {
      console.log('Provider not found:', provider_id);
      return new Response(
        JSON.stringify({ error: 'Provider not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Provider found:', provider.business_name, 'Push notifications enabled:', provider.push_notifications_enabled);

    // Send push notification if enabled
    if (provider.push_notifications_enabled) {
      try {
        const formattedDate = new Date(booking_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });

        const pushResponse = await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: provider.user_id,
            title: 'New Booking Received!',
            body: `${customer_name} booked ${service_name} for ${formattedDate}`,
            data: {
              booking_id,
              service_name,
              customer_name,
              booking_date,
              provider_id,
              action: 'new_booking'
            }
          }
        });

        if (pushResponse.error) {
          console.error('Failed to send push notification:', pushResponse.error);
        } else {
          console.log('Push notification sent successfully for booking:', booking_id);
        }
      } catch (pushError) {
        console.error('Error sending push notification:', pushError);
      }
    } else {
      console.log('Push notifications disabled for provider:', provider_id);
    }

    return new Response(
      JSON.stringify({ 
        message: 'Booking notification processed successfully',
        provider_notified: provider.push_notifications_enabled
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in notify-booking function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});