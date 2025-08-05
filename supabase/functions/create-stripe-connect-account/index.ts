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

    // Create Supabase client for auth
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Create Supabase client with service role for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    // Parse request body
    const { provider_id, return_url, refresh_url } = await req.json();

    if (!provider_id) {
      throw new Error("Provider ID is required");
    }

    console.log("Creating Stripe Connect account for provider:", provider_id);

    // Check if provider already has a Stripe account
    const { data: existingConnection } = await supabaseService
      .from("provider_stripe_connections")
      .select("*")
      .eq("provider_id", provider_id)
      .eq("is_active", true)
      .maybeSingle();

    let accountId = existingConnection?.stripe_account_id;

    // Skip creation if account ID is a test/placeholder account
    const isTestAccount = accountId && (accountId.includes('test') || accountId.length < 20);
    
    // Create new Stripe account if none exists or if existing is a test account
    if (!accountId || isTestAccount) {
      console.log("Creating new Stripe Connect account");
      
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      accountId = account.id;
      console.log("Created Stripe account:", accountId);

      // Store the connection in our database with charges enabled by default
      const { error: insertError } = await supabaseService
        .from("provider_stripe_connections")
        .insert({
          provider_id,
          stripe_account_id: accountId,
          account_status: "pending",
          charges_enabled: true, // Enable by default for new accounts
          payouts_enabled: true, // Enable by default for new accounts
          is_active: true,
        });

      if (insertError) {
        console.error("Error storing Stripe connection:", insertError);
        throw new Error("Failed to store Stripe connection");
      }
    }

    // Create account link for onboarding/dashboard access
    console.log("Creating account link for:", accountId);
    
    // Check if account is already fully set up
    const account = await stripe.accounts.retrieve(accountId);
    
    let accountLink;
    if (account.details_submitted && account.charges_enabled) {
      // Account is fully set up, create dashboard link
      accountLink = await stripe.accounts.createLoginLink(accountId);
    } else {
      // Account needs onboarding
      accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refresh_url || return_url,
        return_url: return_url,
        type: "account_onboarding",
      });
    }

    console.log("Account link created:", accountLink.url);

    // Update account status
    const account = await stripe.accounts.retrieve(accountId);
    
    const { error: updateError } = await supabaseService
      .from("provider_stripe_connections")
      .update({
        account_status: account.details_submitted ? "complete" : "pending",
        charges_enabled: account.charges_enabled || false,
        payouts_enabled: account.payouts_enabled || false,
        updated_at: new Date().toISOString(),
      })
      .eq("provider_id", provider_id)
      .eq("stripe_account_id", accountId);

    if (updateError) {
      console.error("Error updating Stripe connection:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        account_link_url: accountLink.url,
        account_id: accountId,
        account_type: account.details_submitted && account.charges_enabled ? "dashboard" : "onboarding"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in create-stripe-connect-account:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to create Stripe Connect account" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});