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

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("Starting sync of all Stripe accounts");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get all active Stripe connections
    const { data: connections, error: connectionError } = await supabaseClient
      .from("provider_stripe_connections")
      .select("*")
      .eq("is_active", true);

    if (connectionError) {
      throw connectionError;
    }

    if (!connections || connections.length === 0) {
      console.log("No Stripe connections found");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No Stripe connections to sync",
          syncedCount: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${connections.length} Stripe connections to sync`);

    let syncedCount = 0;
    const results = [];

    for (const connection of connections) {
      try {
        console.log(`Syncing account: ${connection.stripe_account_id}`);
        
        // Fetch account details from Stripe
        const account = await stripe.accounts.retrieve(connection.stripe_account_id);
        
        // Update the connection with latest status
        const { error: updateError } = await supabaseClient
          .from("provider_stripe_connections")
          .update({
            account_status: account.details_submitted ? "complete" : "pending",
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            updated_at: new Date().toISOString()
          })
          .eq("id", connection.id);

        if (updateError) {
          console.error(`Error updating connection ${connection.id}:`, updateError);
          results.push({
            providerId: connection.provider_id,
            success: false,
            error: updateError.message
          });
        } else {
          syncedCount++;
          results.push({
            providerId: connection.provider_id,
            success: true,
            status: {
              account_status: account.details_submitted ? "complete" : "pending",
              charges_enabled: account.charges_enabled,
              payouts_enabled: account.payouts_enabled
            }
          });
          console.log(`Successfully synced account for provider ${connection.provider_id}`);
        }
      } catch (error) {
        console.error(`Error syncing account ${connection.stripe_account_id}:`, error);
        results.push({
          providerId: connection.provider_id,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${syncedCount} out of ${connections.length} Stripe accounts`,
        syncedCount,
        totalCount: connections.length,
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error syncing all Stripe accounts:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});