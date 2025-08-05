import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create Supabase client with service role for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Parse request body
    const { provider_id, stripe_account_id } = await req.json();

    if (!provider_id || !stripe_account_id) {
      throw new Error("Provider ID and Stripe account ID are required");
    }

    console.log("Syncing existing Stripe account:", { provider_id, stripe_account_id });

    // Validate the Stripe account exists and retrieve its details
    const account = await stripe.accounts.retrieve(stripe_account_id);
    
    if (!account) {
      throw new Error("Stripe account not found");
    }

    console.log("Account details:", {
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted
    });

    // Update or insert the provider's Stripe connection
    const { error: upsertError } = await supabaseService
      .from("provider_stripe_connections")
      .upsert({
        provider_id,
        stripe_account_id: account.id,
        account_status: account.details_submitted ? "complete" : "pending",
        charges_enabled: account.charges_enabled || false,
        payouts_enabled: account.payouts_enabled || false,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'provider_id'
      });

    if (upsertError) {
      console.error("Error upserting Stripe connection:", upsertError);
      throw new Error("Failed to update Stripe connection");
    }

    console.log("Successfully synced Stripe account for provider:", provider_id);

    return new Response(
      JSON.stringify({ 
        success: true,
        account_id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        account_status: account.details_submitted ? "complete" : "pending"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in sync-existing-stripe-accounts:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to sync Stripe account" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});