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

    // Parse request body - expecting array of { provider_id, stripe_account_id, business_name }
    const { providers } = await req.json();

    if (!providers || !Array.isArray(providers)) {
      throw new Error("Providers array is required");
    }

    console.log("Bulk updating Stripe accounts for providers:", providers.length);

    const results = [];

    for (const provider of providers) {
      const { provider_id, stripe_account_id, business_name } = provider;
      
      if (!provider_id || !stripe_account_id) {
        results.push({
          provider_id,
          business_name,
          success: false,
          error: "Missing provider_id or stripe_account_id"
        });
        continue;
      }

      try {
        // Validate the Stripe account exists and retrieve its details
        const account = await stripe.accounts.retrieve(stripe_account_id);
        
        console.log(`Account details for ${business_name}:`, {
          id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted
        });

        // Update the provider's Stripe connection
        const { error: upsertError } = await supabaseService
          .from("provider_stripe_connections")
          .update({
            stripe_account_id: account.id,
            account_status: account.details_submitted ? "complete" : "pending",
            charges_enabled: account.charges_enabled || false,
            payouts_enabled: account.payouts_enabled || false,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('provider_id', provider_id);

        if (upsertError) {
          console.error(`Error updating provider ${business_name}:`, upsertError);
          results.push({
            provider_id,
            business_name,
            success: false,
            error: upsertError.message
          });
        } else {
          console.log(`Successfully updated ${business_name}`);
          results.push({
            provider_id,
            business_name,
            success: true,
            account_id: account.id,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled
          });
        }

      } catch (stripeError) {
        console.error(`Stripe error for ${business_name}:`, stripeError);
        results.push({
          provider_id,
          business_name,
          success: false,
          error: `Stripe error: ${stripeError.message}`
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Bulk update completed: ${successCount} successful, ${failureCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        total: providers.length,
        successful: successCount,
        failed: failureCount,
        results
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in bulk-update-stripe-accounts:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to bulk update Stripe accounts" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});