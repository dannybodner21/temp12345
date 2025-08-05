import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  console.log("Received webhook event:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase);
        break;
      case "payment_intent.succeeded":
        console.log("Payment succeeded:", event.data.object.id);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, supabase: any) {
  console.log("Processing completed checkout session:", session.id);

  const metadata = session.metadata;
  if (!metadata) {
    console.error("No metadata found in session");
    return;
  }

  const {
    serviceId,
    timeSlotId,
    customerFirstName,
    customerLastName,
    customerPhone,
    customerZipCode,
    createAccount,
    isDepositService,
    fullPrice
  } = metadata;

  // Prepare booking update data
  const bookingUpdate: any = {
    status: 'confirmed',
    customer_notes: `Name: ${customerFirstName} ${customerLastName}, Phone: ${customerPhone}, Email: ${session.customer_details?.email}, Zip: ${customerZipCode}`
  };

  // Add deposit-specific fields for deposit services
  if (isDepositService === 'true') {
    bookingUpdate.deposit_paid = true;
    bookingUpdate.deposit_payment_intent_id = session.payment_intent;
    // Update total price to full price for deposit services
    if (fullPrice) {
      bookingUpdate.total_price = parseFloat(fullPrice) / 100; // Convert from cents
    }
  }

  // Update booking status and add user info
  const { data: booking, error: bookingUpdateError } = await supabase
    .from('bookings')
    .update(bookingUpdate)
    .eq('time_slot_id', timeSlotId)
    .eq('service_id', serviceId)
    .eq('status', 'pending')
    .select(`
      id,
      service_id,
      time_slot_id,
      total_price,
      booking_date,
      services!inner(
        name,
        provider_id,
        service_providers!inner(
          id,
          business_name
        )
      ),
      time_slots!inner(
        date,
        start_time,
        end_time
      )
    `)
    .single();

  if (bookingUpdateError) {
    console.error('Error updating booking:', bookingUpdateError);
    return;
  }

  if (!booking) {
    console.error('No booking found to update');
    return;
  }

  console.log('Booking confirmed:', booking.id);
  console.log('Time slot ID to mark unavailable:', timeSlotId);

  // Get the time slot details to find provider and timing info
  const { data: timeSlotData } = await supabase
    .from('time_slots')
    .select(`
      date,
      start_time,
      end_time,
      services (provider_id)
    `)
    .eq('id', timeSlotId)
    .single();

  // Mark this specific time slot as unavailable
  const { error: timeSlotError } = await supabase
    .from('time_slots')
    .update({ is_available: false })
    .eq('id', timeSlotId);

  if (timeSlotError) {
    console.error('Error updating time slot:', timeSlotError);
  }

  // Also mark ALL time slots for this provider at the same date and time as unavailable
  if (timeSlotData) {
    // First get all service IDs for this provider
    const { data: providerServices } = await supabase
      .from('services')
      .select('id')
      .eq('provider_id', timeSlotData.services.provider_id);

    if (providerServices && providerServices.length > 0) {
      const serviceIds = providerServices.map(service => service.id);
      
      const { error: providerTimeSlotsError } = await supabase
        .from('time_slots')
        .update({ is_available: false })
        .eq('date', timeSlotData.date)
        .eq('start_time', timeSlotData.start_time)
        .in('service_id', serviceIds);

      if (providerTimeSlotsError) {
        console.error('Error updating provider time slots:', providerTimeSlotsError);
      } else {
        console.log(`Marked all time slots unavailable for provider ${timeSlotData.services.provider_id} at ${timeSlotData.start_time} on ${timeSlotData.date}`);
      }
    }
  }

  // Format booking information for notification
  const serviceInfo = booking.services;
  const timeSlotInfo = booking.time_slots;
  const providerInfo = serviceInfo.service_providers;

  const bookingDate = new Date(timeSlotInfo.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const bookingTime = `${timeSlotInfo.start_time} - ${timeSlotInfo.end_time}`;

  // Send booking notifications
  try {
    const { data: notificationData, error: notificationError } = await supabase.functions.invoke('booking-notification', {
      body: {
        booking_id: booking.id,
        provider_id: providerInfo.id,
        service_name: serviceInfo.name,
        customer_name: `${customerFirstName} ${customerLastName}`,
        customer_email: session.customer_details?.email,
        booking_date: bookingDate,
        booking_time: bookingTime,
        total_price: booking.total_price
      }
    });

    if (notificationError) {
      console.error('Error sending booking notifications:', notificationError);
    } else {
      console.log('Booking notifications sent successfully:', notificationData);
    }
  } catch (error) {
    console.error('Error calling booking notification function:', error);
  }

  // Handle account creation if requested
  if (createAccount === 'true' && session.customer_details?.email) {
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: session.customer_details.email,
        email_confirm: true,
        user_metadata: {
          first_name: customerFirstName,
          last_name: customerLastName,
          phone: customerPhone,
          zip_code: customerZipCode
        }
      });

      if (authError) {
        console.error('Error creating user account:', authError);
      } else if (authData.user) {
        // Update booking with user_id
        await supabase
          .from('bookings')
          .update({ user_id: authData.user.id })
          .eq('id', booking.id);

        console.log('User account created and linked to booking:', authData.user.id);
      }
    } catch (error) {
      console.error('Error in account creation process:', error);
    }
  }
}