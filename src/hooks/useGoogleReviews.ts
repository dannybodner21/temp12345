import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GoogleReview {
  author_name: string;
  author_url?: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

interface GooglePlaceDetails {
  place_id: string;
  rating?: number;
  user_ratings_total?: number;
  reviews?: GoogleReview[];
}

export const useGoogleReviews = (googleMapsUrl?: string) => {
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract Place ID from Google Maps URL
  const extractPlaceId = (url: string): string | null => {
    try {
      // Handle shortened Google Maps URLs (maps.app.goo.gl)
      if (url.includes('maps.app.goo.gl') || url.includes('goo.gl')) {
        // For shortened URLs, we'll use the URL itself as an identifier
        // and let the backend handle the resolution
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const shortId = pathParts[pathParts.length - 1];
        return shortId || url; // Return the short ID or the full URL as fallback
      }
      
      // Handle various Google Maps URL formats
      const patterns = [
        /place_id:([a-zA-Z0-9_-]+)/,
        /data=.*?1s([a-zA-Z0-9_-]+)/,
        /cid=(\d+)/,
        /ftid=([a-zA-Z0-9_-]+)/,
        /!1s([a-zA-Z0-9_-]+)/,
        /maps\/place\/[^\/]+\/([a-zA-Z0-9_-]+)/
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return match[1];
        }
      }

      // Try to extract from the URL path for standard Google Maps URLs
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/');
      const placeIndex = pathSegments.findIndex(segment => segment === 'place');
      if (placeIndex !== -1 && pathSegments[placeIndex + 1]) {
        // Extract place ID from the next segment
        const placeInfo = pathSegments[placeIndex + 1];
        const match = placeInfo.match(/([a-zA-Z0-9_-]+)/);
        if (match) {
          return match[1];
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting place ID:', error);
      return null;
    }
  };

  const fetchReviews = useCallback(async () => {
    if (!googleMapsUrl) {
      return;
    }

    // Temporarily disabled to fix service loading issues
    return;

    setLoading(true);
    setError(null);

    try {
      // For shortened URLs, pass the full URL to the backend to resolve
      let identifier = googleMapsUrl;
      
      // Try to extract place ID for non-shortened URLs
      if (!googleMapsUrl.includes('goo.gl')) {
        const placeId = extractPlaceId(googleMapsUrl);
        if (placeId) {
          identifier = placeId;
        }
      }

      // Call our edge function to get reviews
      const { data, error: fetchError } = await supabase.functions.invoke('get-google-reviews', {
        body: { placeId: identifier }
      });

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        setReviews(data.reviews || []);
        setRating(data.rating || null);
        setTotalRatings(data.user_ratings_total || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  }, [googleMapsUrl, extractPlaceId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews, googleMapsUrl]);

  return {
    reviews,
    rating,
    totalRatings,
    loading,
    error,
    refetch: fetchReviews
  };
};