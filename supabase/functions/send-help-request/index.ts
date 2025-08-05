import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Initialize Supabase client for getting user info
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface HelpRequest {
  message: string;
  isLoggedIn: boolean;
  firstName?: string;
  email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, isLoggedIn, firstName, email }: HelpRequest = await req.json();

    if (!message || !message.trim()) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate fields for non-logged-in users
    if (!isLoggedIn && (!firstName?.trim() || !email?.trim())) {
      return new Response(
        JSON.stringify({ error: "Name and email are required for non-logged-in users" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    let userInfo = "";
    let emailSubject = "New Help Request from Your App";

    if (isLoggedIn) {
      // Get JWT from authorization header
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        try {
          const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
          if (user) {
            // Try to get profile info
            const { data: profile } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("user_id", user.id)
              .maybeSingle();
            
            const displayName = profile?.first_name 
              ? `${profile.first_name} ${profile.last_name || ''}`.trim()
              : user.email?.split('@')[0] || 'User';
            
            userInfo = `
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #28a745;">
                <h3 style="color: #155724; margin-top: 0;">From Logged-in User:</h3>
                <p style="color: #155724; margin: 5px 0;"><strong>Name:</strong> ${displayName}</p>
                <p style="color: #155724; margin: 5px 0;"><strong>Email:</strong> ${user.email}</p>
                <p style="color: #155724; margin: 5px 0;"><strong>User ID:</strong> ${user.id}</p>
              </div>
            `;
            emailSubject = `Help Request from ${displayName} (Logged In)`;
          }
        } catch (error) {
          console.error("Error getting user info:", error);
        }
      }
    } else {
      userInfo = `
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404; margin-top: 0;">From Guest User:</h3>
          <p style="color: #856404; margin: 5px 0;"><strong>Name:</strong> ${firstName}</p>
          <p style="color: #856404; margin: 5px 0;"><strong>Email:</strong> ${email}</p>
        </div>
      `;
      emailSubject = `Help Request from ${firstName} (Guest)`;
    }

    console.log("Sending help request email for message:", message);

    const emailResponse = await resend.emails.send({
      from: "Help Request <onboarding@resend.dev>",
      to: ["dannybodner21@gmail.com"],
      subject: emailSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">
            New Help Request
          </h2>
          
          ${userInfo}
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #555; margin-top: 0;">User Message:</h3>
            <p style="color: #333; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              This help request was sent from your wellness app.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Help request email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-help-request function:", error);
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