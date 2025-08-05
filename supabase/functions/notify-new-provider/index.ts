import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

interface ProviderSignupRequest {
  user_id: string;
  business_name: string;
  email: string;
  address: string;
  city: string;
  state: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, business_name, email, address, city, state }: ProviderSignupRequest = await req.json();

    // Send notification email to admin
    const emailResponse = await resend.emails.send({
      from: "Provider Notifications <onboarding@resend.dev>",
      to: ["jaclyntroth@gmail.com"], // Replace with your admin email
      subject: "New Provider Signup - Verification Required",
      html: `
        <h1>New Provider Signup</h1>
        <p>A new service provider has signed up and requires verification:</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Business Details:</h3>
          <p><strong>Business Name:</strong> ${business_name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Location:</strong> ${address}, ${city}, ${state}</p>
          <p><strong>User ID:</strong> ${user_id}</p>
        </div>
        
        <p>Please log in to your admin dashboard to review and verify this provider.</p>
        
        <a href="${supabaseUrl.replace('https://', 'https://f9194abf-c723-4d0f-8ea7-c8aeb5057c8f.lovableproject.com/')}/admin/providers" 
           style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Review Provider
        </a>
      `,
    });

    console.log("Admin notification sent:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);