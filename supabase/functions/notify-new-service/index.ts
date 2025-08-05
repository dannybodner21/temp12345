import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from "npm:resend@2.0.0"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  provider_id: string;
  service_name: string;
  service_id: string;
  platform: string;
  original_price?: number;
  discounted_price?: number;
  discount_percentage?: number;
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
    )

    const { 
      provider_id, 
      service_name, 
      service_id, 
      platform,
      original_price = 0,
      discounted_price = 0,
      discount_percentage = 0
    } = await req.json() as NotificationRequest;

    console.log(`Sending notification for new service: ${service_name} from ${platform}`);

    // Get provider information for notification
    const { data: provider, error: providerError } = await supabase
      .from('service_providers')
      .select('business_name, email, notification_preference, push_notifications_enabled, user_id')
      .eq('id', provider_id)
      .single();

    if (providerError || !provider) {
      throw new Error('Provider not found');
    }

    // Create an in-app notification record (you can expand this to store notifications)
    const notificationMessage = `New service "${service_name}" synced from ${platform} requires your approval before going live.`;
    
    // For now, we'll log the notification
    // In the future, you could:
    // 1. Send email using Resend
    // 2. Send SMS 
    // 3. Create in-app notifications
    // 4. Send push notifications

    console.log(`Notification for ${provider.business_name}:`);
    console.log(`- Service: ${service_name}`);
    console.log(`- Platform: ${platform}`);
    console.log(`- Original Price: $${original_price}`);
    console.log(`- Discounted Price: $${discounted_price}`);
    console.log(`- Discount Applied: ${discount_percentage}%`);
    console.log(`- Message: ${notificationMessage}`);

    // Based on provider's notification preference, send appropriate notification
    if (provider.email && (provider.notification_preference === 'email' || provider.notification_preference === 'both')) {
      try {
        const emailResponse = await resend.emails.send({
          from: "Lately <noreply@lately.com>", // Update with your domain
          to: [provider.email],
          subject: `New Service Approval Required - ${service_name}`,
          html: `
            <h2>New Service Requires Your Approval</h2>
            <p>Hi ${provider.business_name},</p>
            <p>A new service has been synced from your ${platform} account and requires your approval before going live on Lately:</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>${service_name}</h3>
              ${original_price > 0 ? `<p><strong>Original Price:</strong> $${original_price.toFixed(2)}</p>` : ''}
              ${discounted_price > 0 ? `<p><strong>Discounted Price:</strong> $${discounted_price.toFixed(2)}</p>` : ''}
              ${discount_percentage > 0 ? `<p><strong>Discount Applied:</strong> ${discount_percentage}%</p>` : ''}
              <p><strong>Platform:</strong> ${platform}</p>
            </div>
            
            <p>Please log in to your Lately provider dashboard to review and approve this service.</p>
            <p><a href="https://f9194abf-c723-4d0f-8ea7-c8aeb5057c8f.lovableproject.com/provider-dashboard" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Service</a></p>
            
            <p>Best regards,<br>The Lately Team</p>
          `,
        });

        console.log("Email sent successfully:", emailResponse);
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }
    }

    // Send push notification if enabled
    if (provider.push_notifications_enabled) {
      try {
        const pushResponse = await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: provider.user_id,
            title: 'New Service Approval Required',
            body: `${service_name} requires your approval before going live`,
            data: {
              service_name,
              platform,
              provider_id: provider_id,
              action: 'service_approval_required'
            }
          }
        });

        if (pushResponse.error) {
          console.error('Failed to send push notification:', pushResponse.error);
        } else {
          console.log('Push notification sent successfully:', pushResponse.data);
        }
      } catch (pushError) {
        console.error('Error sending push notification:', pushError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification processed',
        notification_sent: notificationMessage
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in notify-new-service:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});