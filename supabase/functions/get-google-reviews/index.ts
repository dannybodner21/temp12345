import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_MAPS_WEB_API_KEY')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured')
    }

    const { placeId } = await req.json()

    if (!placeId) {
      throw new Error('Place ID is required')
    }

    console.log('Processing place identifier:', placeId)

    let actualPlaceId = placeId

    // Check if this looks like a shortened URL or short ID
    if (placeId.startsWith('http') && (placeId.includes('goo.gl') || placeId.includes('maps.app.goo.gl'))) {
      console.log('Detected shortened Google Maps URL, attempting to resolve...')
      
      try {
        // Try to resolve the shortened URL by following redirects
        const resolveResponse = await fetch(placeId, { 
          method: 'GET',
          redirect: 'follow'
        })
        
        if (resolveResponse.ok) {
          const resolvedUrl = resolveResponse.url
          console.log('Resolved URL:', resolvedUrl)
          
          // Try to extract place ID from resolved URL
          const placeIdPatterns = [
            /place_id=([a-zA-Z0-9_-]+)/,
            /data=.*?1s([a-zA-Z0-9_-]+)/,
            /!1s([a-zA-Z0-9_-]+)/,
            /maps\/place\/[^\/]+\/([a-zA-Z0-9_-]+)/,
            /cid=(\d+)/
          ]
          
          for (const pattern of placeIdPatterns) {
            const match = resolvedUrl.match(pattern)
            if (match) {
              actualPlaceId = match[1]
              console.log('Extracted place ID from resolved URL:', actualPlaceId)
              break
            }
          }
          
          // If we still couldn't extract a place ID from the resolved URL,
          // try to extract the business name and address from the URL query parameters
          if (actualPlaceId === placeId) {
            // Try to get business info from query parameter
            const urlObj = new URL(resolvedUrl)
            const queryParam = urlObj.searchParams.get('q')
            
            if (queryParam) {
              console.log('Extracted business query for text search:', queryParam)
              
              // Use Google Places Text Search API
              const textSearchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
              textSearchUrl.searchParams.set('query', queryParam)
              textSearchUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY)
              
              const textSearchResponse = await fetch(textSearchUrl.toString())
              const textSearchData = await textSearchResponse.json()
              
              if (textSearchData.status === 'OK' && textSearchData.results && textSearchData.results.length > 0) {
                actualPlaceId = textSearchData.results[0].place_id
                console.log('Found place ID via text search:', actualPlaceId)
              } else {
                console.log('Text search failed, trying ftid extraction...')
                
                // Try to extract ftid as fallback
                const ftidMatch = resolvedUrl.match(/ftid=([^&]+)/)
                if (ftidMatch) {
                  // ftid format is usually like: 0x80c2bf63ac94f5cb:0x472f0f60eaff0f9e
                  // We can try to use the second part as a CID for text search
                  const ftid = ftidMatch[1]
                  const cidMatch = ftid.match(/:0x([a-f0-9]+)/)
                  if (cidMatch) {
                    const cid = parseInt(cidMatch[1], 16)
                    console.log('Trying CID search with:', cid)
                    
                    const cidSearchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
                    cidSearchUrl.searchParams.set('query', `cid:${cid}`)
                    cidSearchUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY)
                    
                    const cidSearchResponse = await fetch(cidSearchUrl.toString())
                    const cidSearchData = await cidSearchResponse.json()
                    
                    if (cidSearchData.status === 'OK' && cidSearchData.results && cidSearchData.results.length > 0) {
                      actualPlaceId = cidSearchData.results[0].place_id
                      console.log('Found place ID via CID search:', actualPlaceId)
                    }
                  }
                }
                
                if (actualPlaceId === placeId) {
                  throw new Error('Could not extract place ID from any method')
                }
              }
            } else {
              throw new Error('Could not extract business query from resolved URL')
            }
          }
        } else {
          throw new Error('Failed to resolve shortened URL')
        }
      } catch (resolveError) {
        console.error('Error resolving URL:', resolveError)
        throw new Error('Could not resolve shortened URL to get place ID')
      }
    } else if (placeId.length < 20) {
      // If it's just a short ID, we can't use it directly with Places API
      throw new Error('Invalid place ID format')
    }

    // Use Google Places API to get place details including reviews
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    url.searchParams.set('place_id', actualPlaceId)
    url.searchParams.set('fields', 'rating,user_ratings_total,reviews')
    url.searchParams.set('key', GOOGLE_PLACES_API_KEY)

    console.log('Fetching place details for place ID:', actualPlaceId)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== 'OK') {
      console.error('Google Places API error:', data.status, data.error_message)
      throw new Error(`Google Places API error: ${data.status}`)
    }

    const result = data.result || {}
    
    console.log('Successfully fetched place details:', {
      rating: result.rating,
      user_ratings_total: result.user_ratings_total,
      reviews_count: result.reviews?.length || 0
    })
    
    return new Response(
      JSON.stringify({
        rating: result.rating || null,
        user_ratings_total: result.user_ratings_total || null,
        reviews: result.reviews || []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error fetching Google reviews:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        rating: null,
        user_ratings_total: null,
        reviews: []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 with error info instead of 500 to handle gracefully in UI
      },
    )
  }
})