import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_WEB_API_KEY')!

    if (!googleMapsApiKey) {
      throw new Error('Google Maps API key not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting geocoding process...')

    // Get all providers that need geocoding
    const { data: providers, error: fetchError } = await supabase
      .from('service_providers')
      .select('id, business_name, address, city, state, google_maps_url, latitude, longitude')
      .order('created_at', { ascending: false })

    if (fetchError) {
      throw new Error(`Failed to fetch providers: ${fetchError.message}`)
    }

    console.log(`Found ${providers.length} providers to process`)

    let updated = 0
    let errors = 0
    const results = []

    for (const provider of providers) {
      try {
        console.log(`Processing: ${provider.business_name}`)

        // Build the address query for geocoding
        let addressQuery = ''
        
        if (provider.google_maps_url) {
          // If we have a Google Maps URL, try to extract coordinates from it first
          const urlMatch = provider.google_maps_url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
          if (urlMatch) {
            const [, lat, lng] = urlMatch
            console.log(`Found coordinates in URL: ${lat}, ${lng}`)
            
            // Update with coordinates from URL
            const { error: updateError } = await supabase
              .from('service_providers')
              .update({
                latitude: parseFloat(lat),
                longitude: parseFloat(lng)
              })
              .eq('id', provider.id)

            if (updateError) {
              console.error(`Failed to update ${provider.business_name}:`, updateError)
              errors++
            } else {
              updated++
              results.push({
                business_name: provider.business_name,
                method: 'url_extraction',
                latitude: parseFloat(lat),
                longitude: parseFloat(lng)
              })
            }
            continue
          }
        }

        // Build address string for geocoding API
        const addressParts = [
          provider.address,
          provider.city,
          provider.state
        ].filter(Boolean)

        if (addressParts.length === 0) {
          console.log(`Skipping ${provider.business_name} - no address data`)
          continue
        }

        addressQuery = addressParts.join(', ')
        console.log(`Geocoding address: ${addressQuery}`)

        // Call Google Geocoding API
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressQuery)}&key=${googleMapsApiKey}`
        
        const response = await fetch(geocodeUrl)
        const data = await response.json()

        if (data.status === 'OK' && data.results.length > 0) {
          const location = data.results[0].geometry.location
          const lat = location.lat
          const lng = location.lng

          console.log(`Found coordinates: ${lat}, ${lng}`)

          // Update the provider with new coordinates
          const { error: updateError } = await supabase
            .from('service_providers')
            .update({
              latitude: lat,
              longitude: lng
            })
            .eq('id', provider.id)

          if (updateError) {
            console.error(`Failed to update ${provider.business_name}:`, updateError)
            errors++
          } else {
            updated++
            results.push({
              business_name: provider.business_name,
              method: 'geocoding_api',
              latitude: lat,
              longitude: lng,
              formatted_address: data.results[0].formatted_address
            })
          }
        } else {
          console.log(`Geocoding failed for ${provider.business_name}: ${data.status}`)
          errors++
        }

        // Small delay to respect API limits
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (providerError) {
        console.error(`Error processing ${provider.business_name}:`, providerError)
        errors++
      }
    }

    console.log(`Geocoding complete. Updated: ${updated}, Errors: ${errors}`)

    return new Response(
      JSON.stringify({
        success: true,
        total_providers: providers.length,
        updated_count: updated,
        error_count: errors,
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Geocoding function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})