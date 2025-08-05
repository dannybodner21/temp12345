import { useMemo } from "react";
import { FilterState } from "@/components/ServiceFilters";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number | null;
  original_price: number | null;
  price_per_unit: number | null;
  original_price_per_unit: number | null;
  duration_minutes: number;
  image_url: string | null;
  service_categories?: {
    name: string;
  };
  service_providers?: {
    business_name: string;
    google_maps_url?: string;
    instagram_handle?: string | null;
    instagram_url?: string | null;
    share_instagram?: boolean | null;
    phone?: string | null;
    email?: string | null;
    latitude?: number;
    longitude?: number;
  };
  time_slots?: Array<{
    id: string;
    start_time: string;
    end_time: string;
    date: string;
  }>;
  categories?: Array<{
    id: string;
    name: string;
  }>;
}

export function useFilteredServices(services: Service[], filters: FilterState, userLocation?: { lat: number; lng: number }) {
  return useMemo(() => {
    if (!services) return [];

    let filteredServices = [...services];

    // Category filter (now supports multiple categories)
    if (filters.categories.length > 0) {
      filteredServices = filteredServices.filter(service => {
        const serviceCategories = service.categories || [];
        return serviceCategories.some(cat => filters.categories.includes(cat.name));
      });
    }

    // Time of day filter (now supports multiple time periods)
    if (filters.timeOfDay.length > 0) {
      filteredServices = filteredServices.filter(service => {
        if (!service.time_slots?.length) return false;
        
        return service.time_slots.some(slot => {
          const startHour = parseInt(slot.start_time.split(':')[0]);
          
          return filters.timeOfDay.some(timeFilter => {
            switch (timeFilter) {
              case 'morning':
                return startHour >= 6 && startHour < 12;
              case 'afternoon':
                return startHour >= 12 && startHour < 18;
              case 'evening':
                return startHour >= 18 && startHour < 22;
              default:
                return true;
            }
          });
        });
      });
    }

    // Distance filter (requires user location)
    if (filters.distance && userLocation) {
      const maxDistance = parseInt(filters.distance);
      filteredServices = filteredServices.filter(service => {
        const provider = service.service_providers;
        if (!provider?.latitude || !provider?.longitude) return true; // Include if no location data
        
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          provider.latitude,
          provider.longitude
        );
        
        return distance <= maxDistance;
      });
    }

    // Sort services
    switch (filters.sortBy) {
      case 'closest':
        if (userLocation) {
          filteredServices.sort((a, b) => {
            const aProvider = a.service_providers;
            const bProvider = b.service_providers;
            
            if (!aProvider?.latitude || !aProvider?.longitude) return 1;
            if (!bProvider?.latitude || !bProvider?.longitude) return -1;
            
            const distanceA = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              aProvider.latitude,
              aProvider.longitude
            );
            
            const distanceB = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              bProvider.latitude,
              bProvider.longitude
            );
            
            return distanceA - distanceB;
          });
        }
        break;
        
      case 'popular':
        // Sort by number of available time slots as a proxy for popularity
        filteredServices.sort((a, b) => {
          const aSlots = a.time_slots?.length || 0;
          const bSlots = b.time_slots?.length || 0;
          return bSlots - aSlots;
        });
        break;
        
      case 'soonest':
        filteredServices.sort((a, b) => {
          const aEarliest = getEarliestTimeSlot(a.time_slots);
          const bEarliest = getEarliestTimeSlot(b.time_slots);
          
          if (!aEarliest) return 1;
          if (!bEarliest) return -1;
          
          return aEarliest.localeCompare(bEarliest);
        });
        break;
        
      case 'most_discounted':
        filteredServices.sort((a, b) => {
          const aDiscount = calculateDiscount(a);
          const bDiscount = calculateDiscount(b);
          return bDiscount - aDiscount; // Higher discount first
        });
        break;
        
      case 'price_low':
        filteredServices.sort((a, b) => {
          const aPrice = a.price || a.price_per_unit || 0;
          const bPrice = b.price || b.price_per_unit || 0;
          return aPrice - bPrice;
        });
        break;
        
      case 'price_high':
        filteredServices.sort((a, b) => {
          const aPrice = a.price || a.price_per_unit || 0;
          const bPrice = b.price || b.price_per_unit || 0;
          return bPrice - aPrice;
        });
        break;
        
      default:
        // Keep original order
        break;
    }

    return filteredServices;
  }, [services, filters, userLocation]);
}

// Helper function to calculate distance between two coordinates (in miles)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper function to calculate discount percentage
function calculateDiscount(service: Service): number {
  const currentPrice = service.price || service.price_per_unit || 0;
  const originalPrice = service.original_price || service.original_price_per_unit || 0;
  
  if (originalPrice <= currentPrice || originalPrice === 0) return 0;
  
  return ((originalPrice - currentPrice) / originalPrice) * 100;
}

// Helper function to get the earliest time slot for a service
function getEarliestTimeSlot(timeSlots?: Array<{ start_time: string; date: string }>): string | null {
  if (!timeSlots?.length) return null;
  
  const sorted = timeSlots
    .map(slot => `${slot.date}T${slot.start_time}`)
    .sort();
    
  return sorted[0] || null;
}
