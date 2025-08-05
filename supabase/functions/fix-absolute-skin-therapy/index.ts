import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    // Create Supabase client with service role for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("Starting direct Stripe account update for Absolute Skin Therapy");

    // Update Absolute Skin Therapy directly
    const { error: updateError } = await supabaseService
      .from("provider_stripe_connections")
      .update({
        stripe_account_id: "acct_1RpESoED4V8Z7h9u",
        account_status: "complete",
        charges_enabled: true,
        payouts_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('provider_id', 'f239ba50-4b3b-405c-9815-09326b554682');

    if (updateError) {
      console.error("Error updating Absolute Skin Therapy:", updateError);
      throw new Error(`Failed to update: ${updateError.message}`);
    }

    console.log("Successfully updated Absolute Skin Therapy Stripe account");

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Absolute Skin Therapy Stripe account updated successfully",
        stripe_account_id: "acct_1RpESoED4V8Z7h9u"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in fix-absolute-skin-therapy:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to update Stripe account" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});