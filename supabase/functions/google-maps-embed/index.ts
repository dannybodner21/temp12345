import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { googleMapsUrl, businessName } = await req.json()
    
    // Get the appropriate API key based on user agent (mobile vs web)
    const userAgent = req.headers.get('user-agent') || ''
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent)
    
    const apiKey = isMobile 
      ? Deno.env.get('GOOGLE_MAPS_MOBILE_API_KEY')
      : Deno.env.get('GOOGLE_MAPS_WEB_API_KEY')

    if (!apiKey) {
      console.error('Google Maps API key not found for', isMobile ? 'mobile' : 'web')
      throw new Error('Google Maps API key not configured')
    }

    console.log('Processing request for business:', businessName)
    console.log('Google Maps URL:', googleMapsUrl)

    // Convert Google Maps share URL to embeddable URL with API key
    const getEmbedUrl = (url: string, name: string) => {
      try {
        // Extract coordinates or place ID from various Google Maps URL formats
        if (url.includes('maps.app.goo.gl') || url.includes('goo.gl')) {
          // For shortened URLs, use the business name for search
          return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(name)}`
        }
        
        if (url.includes('@')) {
          // Extract coordinates from URLs like: https://maps.google.com/@37.7749,-122.4194,15z
          const match = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
          if (match) {
            const [, lat, lng] = match
            return `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${lat},${lng}&zoom=15`
          }
        }
        
        // Fallback: use the business name for search
        return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(name)}`
      } catch (error) {
        console.error('Error processing URL:', error)
        return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(name)}`
      }
    }

    const embedUrl = getEmbedUrl(googleMapsUrl, businessName)
    console.log('Generated embed URL:', embedUrl)

    return new Response(
      JSON.stringify({ embedUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})