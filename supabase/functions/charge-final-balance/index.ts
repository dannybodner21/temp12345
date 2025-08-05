import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FinalBalanceRequest {
  bookingId: string;
  finalCost: number; // Final cost in dollars
  providerNotes?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, finalCost, providerNotes }: FinalBalanceRequest = await req.json();

    console.log("Processing final balance charge:", {
      bookingId,
      finalCost,
      providerNotes
    });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create Supabase client with service role
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get booking details with service provider information
    const { data: booking, error: bookingError } = await supabaseService
      .from('bookings')
      .select(`
        *,
        service:services(
          *,
          provider:service_providers(
            id,
            business_name,
            default_discount_percentage,
            provider_stripe_connections(stripe_account_id, charges_enabled)
          )
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message || 'Unknown error'}`);
    }

    // Verify this is a deposit booking that needs final payment
    if (!booking.deposit_paid) {
      throw new Error('Deposit has not been paid yet');
    }

    if (booking.final_payment_status === 'paid') {
      throw new Error('Final payment has already been processed');
    }

    // Get the original Stripe payment intent to retrieve the payment method
    const { data: stripeSession } = await supabaseService
      .from('bookings')
      .select('deposit_payment_intent_id')
      .eq('id', bookingId)
      .single();

    if (!stripeSession?.deposit_payment_intent_id) {
      throw new Error('Original payment method not found');
    }

    // Retrieve the original payment intent to get customer and payment method
    const originalPaymentIntent = await stripe.paymentIntents.retrieve(stripeSession.deposit_payment_intent_id);
    const customerId = originalPaymentIntent.customer as string;
    const paymentMethodId = originalPaymentIntent.payment_method as string;

    // Calculate final balance after discount and deposit
    const depositAmount = booking.deposit_amount || 50;
    const discountPercentage = booking.service.provider.default_discount_percentage || 0;
    const discountAmount = (finalCost * discountPercentage) / 100;
    const discountedFinalCost = finalCost - discountAmount;
    const finalBalance = Math.max(0, discountedFinalCost - depositAmount);

    if (finalBalance <= 0) {
      // No additional charge needed, just update the booking
      const { error: updateError } = await supabaseService
        .from('bookings')
        .update({
          final_cost: finalCost,
          final_payment_status: 'paid',
          provider_notes_internal: providerNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (updateError) {
        throw new Error(`Failed to update booking: ${updateError.message}`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No additional charge needed',
        finalBalance: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get Stripe connection for the provider
    const stripeConnection = booking.service.provider.provider_stripe_connections?.[0];
    if (!stripeConnection?.stripe_account_id || !stripeConnection.charges_enabled) {
      throw new Error('Provider payment processing not available');
    }

    // Calculate application fee for the final balance (7% commission)
    const applicationFee = Math.round(finalBalance * 100 * 0.07);

    // Create payment intent for the final balance
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalBalance * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      confirmation_method: 'automatic',
      confirm: true,
      application_fee_amount: applicationFee,
      transfer_data: {
        destination: stripeConnection.stripe_account_id,
      },
      metadata: {
        bookingId,
        originalDepositAmount: depositAmount.toString(),
        finalCost: finalCost.toString(),
        discountApplied: discountAmount.toString(),
        type: 'final_balance'
      }
    });

    // Update booking with final payment information
    const { error: updateError } = await supabaseService
      .from('bookings')
      .update({
        final_cost: finalCost,
        final_payment_intent_id: paymentIntent.id,
        final_payment_status: paymentIntent.status === 'succeeded' ? 'paid' : 'failed',
        provider_notes_internal: providerNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      // Don't throw here as payment was successful
    }

    console.log("Final balance charge successful:", {
      bookingId,
      finalBalance,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    });

    return new Response(JSON.stringify({ 
      success: true,
      finalBalance,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in charge-final-balance function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});