import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  provider_id: string;
  platform: 'square' | 'vagaro' | 'boulevard';
  action: 'authorize' | 'callback';
  code?: string;
  state?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Handle OAuth callback from GET request (Square redirects here)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      
      if (code && state) {
        return await handleSquareOAuth(state, 'callback', code, state, supabase);
      }
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `https://f9194abf-c723-4d0f-8ea7-c8aeb5057c8f.lovableproject.com/provider-dashboard?error=missing_code`
        }
      });
    }

    // Handle POST requests (authorize action)
    const { provider_id, platform, action, code, state } = await req.json() as RequestBody;

    console.log(`Processing ${platform} OAuth ${action} for provider ${provider_id}`);

    switch (platform) {
      case 'square':
        return await handleSquareOAuth(provider_id, action, code, state, supabase);
      case 'vagaro':
        return await handleVagaroOAuth(provider_id, action, code, state, supabase);
      case 'boulevard':
        return await handleBoulevardOAuth(provider_id, action, code, state, supabase);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error) {
    console.error('Error in booking-platform-oauth:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleSquareOAuth(
  provider_id: string, 
  action: string, 
  code?: string, 
  state?: string, 
  supabase?: any
) {
  const squareApplicationId = Deno.env.get('SQUARE_APPLICATION_ID');
  const squareApplicationSecret = Deno.env.get('SQUARE_APPLICATION_SECRET');
  
  // Enhanced logging for debugging
  console.log('=== Square OAuth Handler ===');
  console.log('Provider ID:', provider_id);
  console.log('Action:', action);
  console.log('Code provided:', !!code);
  console.log('State provided:', !!state);
  console.log('Square App ID configured:', !!squareApplicationId);
  console.log('Square App Secret configured:', !!squareApplicationSecret);
  console.log('REQUEST URL:', Deno.env.get('REQUEST_URL') || 'not available');
  console.log('EDGE FUNCTION URL TEST - this should appear in logs if function is called');
  
  if (!squareApplicationId || !squareApplicationSecret) {
    console.error('Missing Square credentials:', {
      hasAppId: !!squareApplicationId,
      hasAppSecret: !!squareApplicationSecret
    });
    throw new Error('Square API credentials not configured');
  }

  if (action === 'authorize') {
    const redirectUri = 'https://f9194abf-c723-4d0f-8ea7-c8aeb5057c8f.lovableproject.com/square-oauth-callback';
    
    console.log('Building authorization URL...');
    console.log('Redirect URI:', redirectUri);
    console.log('Client ID:', squareApplicationId);
    
    const authorizationUrl = new URL('https://connect.squareup.com/oauth2/authorize');
    authorizationUrl.searchParams.append('client_id', squareApplicationId);
    authorizationUrl.searchParams.append('scope', 'MERCHANT_PROFILE_READ ORDERS_READ ORDERS_WRITE PAYMENTS_READ PAYMENTS_WRITE APPOINTMENTS_READ APPOINTMENTS_WRITE');
    authorizationUrl.searchParams.append('response_type', 'code');
    authorizationUrl.searchParams.append('redirect_uri', redirectUri);
    authorizationUrl.searchParams.append('state', provider_id);

    console.log('Authorization URL generated:', authorizationUrl.toString());

    return new Response(
      JSON.stringify({ authorization_url: authorizationUrl.toString() }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  if (action === 'callback') {
    const redirectUri = 'https://f9194abf-c723-4d0f-8ea7-c8aeb5057c8f.lovableproject.com/square-oauth-callback';
    
    console.log('=== OAuth Callback Processing ===');
    console.log('Authorization code:', code);
    console.log('State (provider_id):', state);
    console.log('Redirect URI:', redirectUri);
    
    // Enhanced token exchange with better error handling
    const tokenRequestBody = {
      client_id: squareApplicationId,
      client_secret: squareApplicationSecret,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    };
    
    console.log('Token request body:', {
      client_id: squareApplicationId,
      client_secret: '[REDACTED]',
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    try {
      const tokenResponse = await fetch('https://connect.squareup.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Square-Version': '2024-07-17', // Updated to latest version
          'Accept': 'application/json'
        },
        body: JSON.stringify(tokenRequestBody)
      });

      console.log('Token response status:', tokenResponse.status);
      console.log('Token response headers:', Object.fromEntries(tokenResponse.headers.entries()));

      const responseText = await tokenResponse.text();
      console.log('Token response body:', responseText);

      if (!tokenResponse.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { error: 'Failed to parse error response', raw: responseText };
        }
        
        console.error('Token exchange failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorData
        });
        
        return new Response(null, {
          status: 302,
          headers: {
            'Location': `https://f9194abf-c723-4d0f-8ea7-c8aeb5057c8f.lovableproject.com/provider-dashboard?error=oauth_failed&details=${encodeURIComponent(JSON.stringify(errorData))}`
          }
        });
      }

      const tokenData = JSON.parse(responseText);
      console.log('Token data received:', {
        access_token: tokenData.access_token ? '[PRESENT]' : '[MISSING]',
        refresh_token: tokenData.refresh_token ? '[PRESENT]' : '[MISSING]',
        expires_at: tokenData.expires_at,
        merchant_id: tokenData.merchant_id,
        scope: tokenData.scope
      });
      
      // Store the connection in the database
      if (supabase) {
        console.log('Storing connection in database...');
        const connectionData = {
          provider_id: provider_id,
          platform: 'square',
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at ? new Date(tokenData.expires_at).toISOString() : null,
          platform_user_id: tokenData.merchant_id,
          scope: tokenData.scope,
          platform_specific_data: {
            square_application_id: squareApplicationId,
            square_merchant_id: tokenData.merchant_id
          },
          is_active: true
        };
        
        console.log('Connection data to store:', {
          ...connectionData,
          access_token: '[REDACTED]',
          refresh_token: '[REDACTED]'
        });

        // Store in provider_platform_connections
        const { error } = await supabase
          .from('provider_platform_connections')
          .upsert(connectionData);

        if (error) {
          console.error('Error storing Square connection:', error);
          return new Response(null, {
            status: 302,
            headers: {
              'Location': `https://f9194abf-c723-4d0f-8ea7-c8aeb5057c8f.lovableproject.com/provider-dashboard?error=storage_failed&details=${encodeURIComponent(JSON.stringify(error))}`
            }
          });
        }
        
        console.log('Connection stored successfully in provider_platform_connections');

        // Also store in provider_square_connections for compatibility
        const squareConnectionData = {
          provider_id: provider_id,
          square_application_id: squareApplicationId,
          square_merchant_id: tokenData.merchant_id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          scope: tokenData.scope,
          expires_at: tokenData.expires_at ? new Date(tokenData.expires_at).toISOString() : null,
          is_active: true
        };

        const { error: squareError } = await supabase
          .from('provider_square_connections')
          .upsert(squareConnectionData);

        if (squareError) {
          console.error('Error storing Square-specific connection:', squareError);
          // Don't fail the whole flow for this secondary storage
        } else {
          console.log('Square-specific connection stored successfully');
        }
      }

      // Redirect back to the dashboard with success
      console.log('Redirecting to success page...');
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `https://f9194abf-c723-4d0f-8ea7-c8aeb5057c8f.lovableproject.com/provider-dashboard?connected=square`
        }
      });
    } catch (error) {
      console.error('Exception during token exchange:', error);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `https://f9194abf-c723-4d0f-8ea7-c8aeb5057c8f.lovableproject.com/provider-dashboard?error=network_error&details=${encodeURIComponent(error.message)}`
        }
      });
    }
  }

  throw new Error(`Unsupported Square action: ${action}`);
}

async function handleVagaroOAuth(
  provider_id: string, 
  action: string, 
  code?: string, 
  state?: string, 
  supabase?: any
) {
  // Placeholder for Vagaro OAuth implementation
  if (action === 'authorize') {
    return new Response(
      JSON.stringify({ error: 'Vagaro integration coming soon' }),
      { 
        status: 501, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  throw new Error('Vagaro integration not yet implemented');
}

async function handleBoulevardOAuth(
  provider_id: string, 
  action: string, 
  code?: string, 
  state?: string, 
  supabase?: any
) {
  // Placeholder for Boulevard OAuth implementation
  if (action === 'authorize') {
    return new Response(
      JSON.stringify({ error: 'Boulevard integration coming soon' }),
      { 
        status: 501, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  throw new Error('Boulevard integration not yet implemented');
}