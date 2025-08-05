import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SavePaymentMethodRequest {
  payment_method_id: string;
  customer_id: string;
  is_default?: boolean;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for database writes
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user (using anon key for auth)
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    const { payment_method_id, customer_id, is_default = false }: SavePaymentMethodRequest = await req.json();

    console.log("Saving payment method for user:", user.email, "PM:", payment_method_id);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);
    
    if (!paymentMethod.card) {
      throw new Error("Only card payment methods are supported currently");
    }

    // If this is being set as default, unset any existing defaults
    if (is_default) {
      await supabaseClient
        .from("customer_payment_methods")
        .update({ is_default: false })
        .eq("user_id", user.id);
    }

    // Save payment method info to database
    const { error: dbError } = await supabaseClient
      .from("customer_payment_methods")
      .insert({
        user_id: user.id,
        stripe_customer_id: customer_id,
        stripe_payment_method_id: payment_method_id,
        payment_method_type: paymentMethod.type,
        card_brand: paymentMethod.card.brand,
        card_last4: paymentMethod.card.last4,
        card_exp_month: paymentMethod.card.exp_month,
        card_exp_year: paymentMethod.card.exp_year,
        is_default: is_default,
      });

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to save payment method to database");
    }

    console.log("Payment method saved successfully");

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Error saving payment method:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});