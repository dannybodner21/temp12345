import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SquareTokenResponse {
  access_token: string
  refresh_token: string
  expires_at: string
  token_type: string
  merchant_id: string
}

interface PlatformTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  console.log('🔄 Starting token refresh process...')

  try {
    // Refresh Square tokens
    await refreshSquareTokens(supabase)
    
    // Refresh other platform tokens
    await refreshPlatformTokens(supabase)

    console.log('✅ Token refresh completed successfully')
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'All tokens refreshed successfully',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('❌ Token refresh failed:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function refreshSquareTokens(supabase: any) {
  console.log('🔄 Refreshing Square tokens...')
  
  // Get all active Square connections
  const { data: connections, error } = await supabase
    .from('provider_square_connections')
    .select(`
      id,
      provider_id,
      access_token,
      refresh_token,
      expires_at,
      square_application_id,
      square_merchant_id,
      service_providers!inner(business_name, email)
    `)
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching Square connections:', error)
    throw new Error(`Failed to fetch Square connections: ${error.message}`)
  }

  if (!connections || connections.length === 0) {
    console.log('No active Square connections found')
    return
  }

  console.log(`Found ${connections.length} Square connections to refresh`)

  const refreshPromises = connections.map(async (connection: any) => {
    try {
      console.log(`Refreshing Square token for provider: ${connection.service_providers.business_name}`)
      
      const newTokens = await refreshSquareToken(
        connection.refresh_token,
        connection.square_application_id
      )

      // Update the database with new tokens
      const { error: updateError } = await supabase
        .from('provider_square_connections')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at: newTokens.expires_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id)

      if (updateError) {
        console.error(`Failed to update Square tokens for ${connection.service_providers.business_name}:`, updateError)
        throw updateError
      }

      console.log(`✅ Square tokens refreshed for ${connection.service_providers.business_name}`)
    } catch (error) {
      console.error(`Failed to refresh Square token for ${connection.service_providers.business_name}:`, error)
      
      // Mark connection as inactive if refresh fails
      await supabase
        .from('provider_square_connections')
        .update({ is_active: false })
        .eq('id', connection.id)
    }
  })

  await Promise.all(refreshPromises)
}

async function refreshSquareToken(refreshToken: string, applicationId: string): Promise<SquareTokenResponse> {
  const squareSecret = Deno.env.get('SQUARE_OAuth_sandbox-new_Secret') || Deno.env.get('SQUARE_OAuth_Production_Secret')
  
  if (!squareSecret) {
    throw new Error('Square OAuth secret not configured')
  }

  const tokenUrl = 'https://connect.squareup.com/oauth2/token'
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Square-Version': '2024-06-04'
    },
    body: JSON.stringify({
      client_id: applicationId,
      client_secret: squareSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Square token refresh failed: ${response.status} - ${error}`)
  }

  const data = await response.json()
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    token_type: data.token_type,
    merchant_id: data.merchant_id
  }
}

async function refreshPlatformTokens(supabase: any) {
  console.log('🔄 Refreshing platform tokens...')
  
  // Get all active platform connections
  const { data: connections, error } = await supabase
    .from('provider_platform_connections')
    .select(`
      id,
      provider_id,
      platform,
      access_token,
      refresh_token,
      expires_at,
      platform_specific_data,
      service_providers!inner(business_name, email)
    `)
    .eq('is_active', true)
    .not('refresh_token', 'is', null)

  if (error) {
    console.error('Error fetching platform connections:', error)
    throw new Error(`Failed to fetch platform connections: ${error.message}`)
  }

  if (!connections || connections.length === 0) {
    console.log('No active platform connections found')
    return
  }

  console.log(`Found ${connections.length} platform connections to refresh`)

  const refreshPromises = connections.map(async (connection: any) => {
    try {
      console.log(`Refreshing ${connection.platform} token for provider: ${connection.service_providers.business_name}`)
      
      const newTokens = await refreshPlatformToken(
        connection.platform,
        connection.refresh_token,
        connection.platform_specific_data
      )

      // Calculate new expiration date
      const expiresAt = newTokens.expires_in 
        ? new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString()
        : null

      // Update the database with new tokens
      const { error: updateError } = await supabase
        .from('provider_platform_connections')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token || connection.refresh_token,
          expires_at: expiresAt,
          scope: newTokens.scope || connection.scope,
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id)

      if (updateError) {
        console.error(`Failed to update ${connection.platform} tokens for ${connection.service_providers.business_name}:`, updateError)
        throw updateError
      }

      console.log(`✅ ${connection.platform} tokens refreshed for ${connection.service_providers.business_name}`)
    } catch (error) {
      console.error(`Failed to refresh ${connection.platform} token for ${connection.service_providers.business_name}:`, error)
      
      // Mark connection as inactive if refresh fails
      await supabase
        .from('provider_platform_connections')
        .update({ is_active: false })
        .eq('id', connection.id)
    }
  })

  await Promise.all(refreshPromises)
}

async function refreshPlatformToken(platform: string, refreshToken: string, platformData: any): Promise<PlatformTokenResponse> {
  switch (platform) {
    case 'vagaro':
      return await refreshVagaroToken(refreshToken, platformData)
    case 'boulevard':
      return await refreshBoulevardToken(refreshToken, platformData)
    case 'zenoti':
      return await refreshZenotiToken(refreshToken, platformData)
    case 'setmore':
      return await refreshSetmoreToken(refreshToken, platformData)
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

async function refreshVagaroToken(refreshToken: string, platformData: any): Promise<PlatformTokenResponse> {
  // Vagaro token refresh implementation
  const response = await fetch('https://api.vagaro.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: platformData.client_id,
      client_secret: platformData.client_secret
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Vagaro token refresh failed: ${response.status} - ${error}`)
  }

  return await response.json()
}

async function refreshBoulevardToken(refreshToken: string, platformData: any): Promise<PlatformTokenResponse> {
  // Boulevard token refresh implementation
  const response = await fetch('https://api.boulevard.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: platformData.client_id,
      client_secret: platformData.client_secret
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Boulevard token refresh failed: ${response.status} - ${error}`)
  }

  return await response.json()
}

async function refreshZenotiToken(refreshToken: string, platformData: any): Promise<PlatformTokenResponse> {
  // Zenoti token refresh implementation
  const response = await fetch('https://api.zenoti.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: platformData.client_id,
      client_secret: platformData.client_secret
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Zenoti token refresh failed: ${response.status} - ${error}`)
  }

  return await response.json()
}

async function refreshSetmoreToken(refreshToken: string, platformData: any): Promise<PlatformTokenResponse> {
  // Setmore token refresh implementation
  const response = await fetch('https://developer.setmore.com/api/v1/o/oauth2/token/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Setmore token refresh failed: ${response.status} - ${error}`)
  }

  return await response.json()
}