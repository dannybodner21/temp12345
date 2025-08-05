import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminLoginRequest {
  password: string;
  email?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  } 

  try {
    const { password, email }: AdminLoginRequest = await req.json();

    // Get the admin password from secrets
    const adminPassword = Deno.env.get("ADMIN_PASSWORD");
    if (!adminPassword) {
      throw new Error("Admin password not configured");
    }

    // Verify the password
    if (password !== adminPassword) {
      throw new Error("Invalid admin password");
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    let user = null;

    // If email provided, try to sign them in
    if (email) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password: password
      });
      
      if (error) {
        console.log("Auth error (continuing anyway):", error.message);
        // Don't throw error here - admin access doesn't require Supabase auth
      } else {
        user = data.user;
      }
    }

    // Verify admin access using our RPC function
    let isAdmin = false;
    if (user) {
      // Use service role to check admin status
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      const { data, error } = await supabaseService.rpc('is_admin_user');
      if (!error && data) {
        isAdmin = true;
      }
    } else {
      // For password-only access, allow admin access
      // You can add additional checks here if needed
      isAdmin = true;
    }

    if (!isAdmin) {
      throw new Error("Admin privileges required");
    }

    console.log("Admin access granted");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin access granted",
        user: user ? { id: user.id, email: user.email } : null
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Admin login error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Authentication failed" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      }
    );
  }
});