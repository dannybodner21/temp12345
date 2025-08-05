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

    const { providerId } = await req.json();
    
    if (!providerId) {
      throw new Error("Provider ID is required");
    }

    console.log(`Syncing Stripe status for provider: ${providerId}`);

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get the provider's Stripe connection
    const { data: connections, error: connectionError } = await supabaseClient
      .from("provider_stripe_connections")
      .select("*")
      .eq("provider_id", providerId)
      .eq("is_active", true);

    if (connectionError) {
      throw connectionError;
    }

    if (!connections || connections.length === 0) {
      console.log(`No Stripe connection found for provider ${providerId}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No Stripe connection found for this provider",
          hasConnection: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const connection = connections[0];
    console.log(`Found Stripe connection: ${connection.stripe_account_id}`);

    // Fetch account details from Stripe
    const account = await stripe.accounts.retrieve(connection.stripe_account_id);
    console.log(`Stripe account status: ${account.details_submitted}, charges: ${account.charges_enabled}, payouts: ${account.payouts_enabled}`);

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
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Stripe account status synced successfully",
        hasConnection: true,
        status: {
          account_status: account.details_submitted ? "complete" : "pending",
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error syncing Stripe account status:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        hasConnection: false
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});