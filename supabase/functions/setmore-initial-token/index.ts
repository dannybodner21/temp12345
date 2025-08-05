import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SetmoreTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { provider_id } = await req.json()

    if (!provider_id) {
      throw new Error('Provider ID is required')
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the refresh token from Supabase secrets
    const refreshToken = Deno.env.get('SETMORE_REFRESH_TOKEN')
    if (!refreshToken) {
      throw new Error('SETMORE_REFRESH_TOKEN not found in environment')
    }

    console.log('Getting initial Setmore access token...')

    // Use the refresh token to get access token
    // Note: Setmore uses the refresh token as the initial way to get access tokens
    const tokenResponse = await fetch('https://developer.setmore.com/api/v1/o/oauth2/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Setmore token exchange failed:', errorText)
      throw new Error(`Setmore token exchange failed: ${tokenResponse.status} - ${errorText}`)
    }

    const tokenData: SetmoreTokenResponse = await tokenResponse.json()
    console.log('✅ Setmore access token obtained successfully')

    // Get user info from Setmore to store additional data
    const userInfoResponse = await fetch('https://developer.setmore.com/api/v1/bookingapi/staffs', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    let platformSpecificData = {}
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json()
      platformSpecificData = {
        staff_info: userInfo,
        token_obtained_at: new Date().toISOString(),
      }
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))

    // Store the connection in database
    const { data: connection, error: insertError } = await supabase
      .from('provider_platform_connections')
      .insert({
        provider_id,
        platform: 'setmore',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt.toISOString(),
        scope: tokenData.scope,
        platform_specific_data: platformSpecificData,
        is_active: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to store Setmore connection:', insertError)
      throw insertError
    }

    console.log('✅ Setmore connection stored successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Setmore connection established successfully',
        connection_id: connection.id,
        expires_at: expiresAt.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in setmore-initial-token:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})