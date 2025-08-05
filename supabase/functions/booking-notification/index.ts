import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Gmail SMTP configuration
const smtpClient = new SMTPClient({
  connection: {
    hostname: Deno.env.get("GMAIL_SMTP_HOST") || "smtp.gmail.com",
    port: parseInt(Deno.env.get("GMAIL_SMTP_PORT") || "587"),
    tls: true,
    auth: {
      username: Deno.env.get("GMAIL_SMTP_USER") || "",
      password: Deno.env.get("GMAIL_SMTP_PASSWORD") || "",
    },
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BookingNotificationRequest {
  booking_id: string;
  provider_id: string;
  service_name: string;
  customer_name: string;
  customer_email: string;
  booking_date: string;
  booking_time: string;
  total_price: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      booking_id, 
      provider_id, 
      service_name, 
      customer_name, 
      customer_email, 
      booking_date, 
      booking_time, 
      total_price 
    }: BookingNotificationRequest = await req.json();

    console.log('Processing booking notification for provider:', provider_id);

    // Get provider details and preferences
    const { data: provider, error: providerError } = await supabase
      .from('service_providers')
      .select(`
        business_name,
        email,
        phone,
        instagram_handle,
        notification_preference,
        share_instagram,
        share_phone,
        push_notifications_enabled,
        accepts_text_messages,
        user_id
      `)
      .eq('id', provider_id)
      .single();

    if (providerError || !provider) {
      console.error('Error fetching provider:', providerError);
      throw new Error('Provider not found');
    }

    console.log('Provider preferences:', {
      notification_preference: provider.notification_preference,
      share_instagram: provider.share_instagram,
      share_phone: provider.share_phone
    });

    const formattedDate = new Date(booking_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Send email notification if preference includes email
    if (provider.notification_preference === 'email' || provider.notification_preference === 'both') {
      console.log('Sending email notification to:', provider.email);
      
      try {
        await smtpClient.send({
          from: Deno.env.get("GMAIL_SMTP_USER") || "",
          to: provider.email,
          subject: `New Booking: ${service_name}`,
          content: "text/html",
          html: `
            <h2>New Booking Received!</h2>
            <p>You have a new booking for your business <strong>${provider.business_name}</strong>.</p>
            
            <h3>Booking Details:</h3>
            <ul>
              <li><strong>Service:</strong> ${service_name}</li>
              <li><strong>Customer:</strong> ${customer_name}</li>
              <li><strong>Customer Email:</strong> ${customer_email}</li>
              <li><strong>Date:</strong> ${formattedDate}</li>
              <li><strong>Time:</strong> ${booking_time}</li>
              <li><strong>Total:</strong> $${total_price}</li>
            </ul>
            
            <p>Please prepare for your appointment and reach out to the customer if needed.</p>
            
            <p>Best regards,<br>The Lately Team</p>
          `,
        });
        console.log('Email notification sent successfully');
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }
    }

    // TODO: Add SMS notification logic here when SMS service is integrated
    if (provider.notification_preference === 'sms' || provider.notification_preference === 'both') {
      console.log('SMS notification would be sent to:', provider.phone);
      // For now, just log that SMS would be sent
      // In production, integrate with Twilio or similar SMS service
    }

    // Send push notification if enabled
    if (provider.push_notifications_enabled) {
      try {
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
              booking_time,
              total_price: total_price.toString(),
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
    }

    // Prepare contact information to share with customer
    const contactInfo: { instagram?: string; phone?: string } = {};
    
    if (provider.share_instagram && provider.instagram_handle) {
      contactInfo.instagram = provider.instagram_handle;
    }
    
    if (provider.share_phone && provider.phone) {
      contactInfo.phone = provider.phone;
    }

    // Send booking confirmation to customer with provider contact info
    let customerEmailContent = `
      <h2>Booking Confirmed!</h2>
      <p>Thank you for booking with <strong>${provider.business_name}</strong>.</p>
      
      <h3>Your Booking Details:</h3>
      <ul>
        <li><strong>Service:</strong> ${service_name}</li>
        <li><strong>Date:</strong> ${formattedDate}</li>
        <li><strong>Time:</strong> ${booking_time}</li>
        <li><strong>Total:</strong> $${total_price}</li>
      </ul>
    `;

    if (Object.keys(contactInfo).length > 0) {
      customerEmailContent += `
        <h3>Provider Contact Information:</h3>
        <ul>
      `;
      
      if (contactInfo.instagram) {
        customerEmailContent += `<li><strong>Instagram:</strong> @${contactInfo.instagram}</li>`;
      }
      
      if (contactInfo.phone) {
        const textNote = provider.accepts_text_messages ? ' (Text messages welcome)' : ' (Voice calls only)';
        customerEmailContent += `<li><strong>Phone:</strong> ${contactInfo.phone}${textNote}</li>`;
      }
      
      customerEmailContent += `</ul>`;
    }

    customerEmailContent += `
      <p>We look forward to seeing you!</p>
      <p>Best regards,<br>${provider.business_name}</p>
    `;

    try {
      await smtpClient.send({
        from: Deno.env.get("GMAIL_SMTP_USER") || "",
        to: customer_email,
        subject: `Booking Confirmation - ${service_name}`,
        content: "text/html",
        html: customerEmailContent,
      });
      console.log('Customer confirmation email sent successfully');
    } catch (customerEmailError) {
      console.error('Customer email sending failed:', customerEmailError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notifications sent successfully',
        contact_shared: contactInfo
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in booking-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);