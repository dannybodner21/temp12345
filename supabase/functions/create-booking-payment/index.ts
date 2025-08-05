import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingPaymentRequest {
  serviceId: string;
  timeSlotId: string;
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    zipCode: string;
    createAccount: boolean;
  };
  amount: number; // Amount in cents (deposit or full price)
  fullPrice: number; // Full price in cents (for deposit services)
  isDepositService: boolean;
  serviceName: string;
  providerName: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      serviceId,
      timeSlotId,
      customerInfo,
      amount,
      fullPrice,
      isDepositService,
      serviceName,
      providerName
    }: BookingPaymentRequest = await req.json();

    console.log("Creating booking payment session:", {
      serviceId,
      timeSlotId,
      amount,
      fullPrice,
      isDepositService,
      customerEmail: customerInfo.email
    });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create Supabase client
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if the time slot is still available before proceeding
    const { data: timeSlot, error: timeSlotCheckError } = await supabaseService
      .from('time_slots')
      .select('is_available')
      .eq('id', timeSlotId)
      .single();

    if (timeSlotCheckError) {
      console.error('Error checking time slot availability:', timeSlotCheckError);
      throw new Error('Unable to verify time slot availability. Please try again.');
    }

    if (!timeSlot || !timeSlot.is_available) {
      console.log('Time slot no longer available:', timeSlotId);
      throw new Error('Sorry, this time slot is no longer available. Please select a different time.');
    }

    // Check if customer already exists in Stripe
    const customers = await stripe.customers.list({ 
      email: customerInfo.email, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: customerInfo.email,
        name: `${customerInfo.firstName} ${customerInfo.lastName}`,
        phone: customerInfo.phone,
        address: {
          postal_code: customerInfo.zipCode
        }
      });
      customerId = customer.id;
    }

    // Get service details for connect account
    const { data: service, error: serviceError } = await supabaseService
      .from('services')
      .select(`
        *,
        provider:service_providers(
          id,
          business_name
        )
      `)
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      console.error('Service query error:', serviceError);
      throw new Error(`Service not found: ${serviceError?.message || 'Unknown error'}`);
    }

    // Get provider's Stripe connection separately
    const { data: stripeConnection, error: stripeError } = await supabaseService
      .from('provider_stripe_connections')
      .select('stripe_account_id, charges_enabled')
      .eq('provider_id', service.provider.id)
      .single();

    if (stripeError || !stripeConnection) {
      console.error('Stripe connection query error:', stripeError);
      console.error('Service provider ID:', service.provider.id);
      throw new Error('This provider has not set up payment processing yet. Please contact the provider to enable payments, or try a different service.');
    }

    if (!stripeConnection.stripe_account_id) {
      console.error('Provider missing Stripe account ID:', {
        providerId: service.provider.id,
        hasConnection: !!stripeConnection,
        hasAccountId: !!stripeConnection.stripe_account_id,
        chargesEnabled: !!stripeConnection.charges_enabled
      });
      throw new Error('This provider has not completed their Stripe setup. Please contact the provider to enable payments, or try a different service.');
    }

    if (!stripeConnection.charges_enabled) {
      console.error('Provider Stripe charges not enabled:', {
        providerId: service.provider.id,
        stripeAccountId: stripeConnection.stripe_account_id,
        chargesEnabled: stripeConnection.charges_enabled
      });
      throw new Error('This provider has not activated payment processing yet. Please contact the provider to enable payments, or try a different service.');
    }

    // Validate the Stripe account exists and is active
    try {
      const account = await stripe.accounts.retrieve(stripeConnection.stripe_account_id);
      if (!account || account.charges_enabled !== true) {
        console.error('Stripe account validation failed:', {
          accountExists: !!account,
          chargesEnabled: account?.charges_enabled,
          providerId: service.provider.id
        });
        throw new Error('This provider\'s payment processing is temporarily unavailable. Please contact the provider or try a different service.');
      }
      console.log('Stripe account validated successfully:', {
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled
      });
    } catch (stripeError) {
      console.error('Stripe account retrieval error:', {
        error: stripeError.message,
        accountId: stripeConnection.stripe_account_id,
        providerId: service.provider.id
      });
      throw new Error('This provider\'s payment processing is temporarily unavailable. Please contact the provider or try a different service.');
    }

    // Calculate application fee (7% commission)
    const applicationFee = Math.round(amount * 0.07);

    // Create Checkout Session
    const sessionConfig: any = {
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: isDepositService ? `${serviceName} (Deposit)` : serviceName,
              description: isDepositService 
                ? `$50 deposit for ${serviceName} by ${providerName}` 
                : `Service by ${providerName}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/services`,
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: stripeConnection.stripe_account_id,
        },
      },
      metadata: {
        serviceId,
        timeSlotId,
        customerFirstName: customerInfo.firstName,
        customerLastName: customerInfo.lastName,
        customerPhone: customerInfo.phone,
        customerZipCode: customerInfo.zipCode,
        createAccount: customerInfo.createAccount.toString(),
        isDepositService: isDepositService.toString(),
        fullPrice: fullPrice?.toString() || amount.toString(),
      }
    };

    // For deposit services, save payment method for future charging
    if (isDepositService) {
      sessionConfig.payment_intent_data.setup_future_usage = 'off_session';
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Create pending booking in database
    const bookingData: any = {
      service_id: serviceId,
      time_slot_id: timeSlotId,
      user_id: null, // Guest booking - no user account
      total_price: isDepositService ? (fullPrice / 100) : (amount / 100), // Full service price
      status: 'pending', // Use valid status that matches constraint
      customer_notes: `Name: ${customerInfo.firstName} ${customerInfo.lastName}, Phone: ${customerInfo.phone}, Email: ${customerInfo.email}, Zip: ${customerInfo.zipCode}`,
      booking_date: new Date().toISOString()
    };

    // Add deposit-specific fields for deposit services
    if (isDepositService) {
      bookingData.deposit_amount = 50.00;
      bookingData.final_cost = null; // To be set by provider later
      bookingData.deposit_paid = false; // Will be updated in webhook
      bookingData.final_payment_status = 'pending';
    }

    const { data: booking, error: bookingError } = await supabaseService
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      throw new Error('Failed to create booking');
    }

    console.log("Booking created successfully:", booking.id);

    // Mark the specific time slot as unavailable immediately
    const { error: timeSlotError } = await supabaseService
      .from('time_slots')
      .update({ is_available: false })
      .eq('id', timeSlotId);

    if (timeSlotError) {
      console.error('Error updating time slot:', timeSlotError);
    } else {
      console.log('Successfully marked time slot as unavailable:', timeSlotId);
    }

    // Now mark ALL concurrent time slots for this provider at the same date and time as unavailable
    const { data: timeSlotData, error: timeSlotQueryError } = await supabaseService
      .from('time_slots')
      .select(`
        date,
        start_time,
        end_time,
        services!inner (
          provider_id
        )
      `)
      .eq('id', timeSlotId)
      .single();

    if (timeSlotQueryError) {
      console.error('Error fetching time slot data:', timeSlotQueryError);
    } else if (timeSlotData) {
      console.log('Found time slot data:', timeSlotData);
      
      // Get all service IDs for this provider
      const { data: providerServices, error: servicesError } = await supabaseService
        .from('services')
        .select('id')
        .eq('provider_id', timeSlotData.services.provider_id);

      if (servicesError) {
        console.error('Error fetching provider services:', servicesError);
      } else if (providerServices && providerServices.length > 0) {
        const serviceIds = providerServices.map(service => service.id);
        console.log('Found provider services:', serviceIds);
        
        // Mark all truly overlapping time slots as unavailable
        // Two slots overlap if: start1 < end2 AND start2 < end1
        // This excludes adjacent slots (e.g., 2:00-2:30 and 2:30-3:00)
        const { error: concurrentSlotsError } = await supabaseService
          .from('time_slots')
          .update({ is_available: false })
          .eq('date', timeSlotData.date)
          .in('service_id', serviceIds)
          .lt('start_time', timeSlotData.end_time)
          .gt('end_time', timeSlotData.start_time);

        if (concurrentSlotsError) {
          console.error('Error updating concurrent time slots:', concurrentSlotsError);
        } else {
          console.log(`Successfully marked all concurrent time slots unavailable for provider ${timeSlotData.services.provider_id} at ${timeSlotData.start_time} on ${timeSlotData.date}`);
        }
      }
    }

    console.log("Payment session created successfully:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in create-booking-payment function:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      cause: error.cause
    });
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        details: error instanceof Error ? error.stack : String(error)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});