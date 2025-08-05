import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import FixCoordinatesButton from './FixCoordinatesButton';
import { getTodayInPacific, formatTimeInPacific, getNowInPacific, formatInPacific } from '@/lib/timezone';
import { debugTimezone } from '@/utils/debug-timezone';

interface ServiceLocation {
  id: string;
  name: string;
  business_name: string;
  time_available: string;
  latitude: number;
  longitude: number;
  price: number;
  duration: number;
  totalServices?: number;
}

interface InteractiveMapProps {
  onServiceClick?: (serviceId: string) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ onServiceClick }) => {
  const queryClient = useQueryClient();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceLocation | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const isMobile = useIsMobile();

  // Get Mapbox token from Supabase secrets
  useEffect(() => {
    const fetchMapboxToken = async () => {
      console.log('Fetching Mapbox token...');
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        console.log('Mapbox token response:', { data, error });
        
        if (error) {
          console.error('Edge function error:', error);
          // For now, let's try a test token to see if the issue is the token or something else
          setMapboxToken('pk.test');
          return;
        }
        
        const token = data?.token || '';
        console.log('Setting Mapbox token:', token ? 'Token received' : 'No token received');
        setMapboxToken(token);
      } catch (error) {
        console.error('Failed to fetch Mapbox token:', error);
        // Use a test token for debugging
        setMapboxToken('pk.test');
      }
    };
    fetchMapboxToken();
  }, []);

  // Fetch today's services grouped by provider location
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['map-services'],
    queryFn: async () => {
      // Debug timezone handling
      debugTimezone();
      
      // Use Pacific Time for all date operations
      const todayPacific = getTodayInPacific();
      const currentPacificTime = getNowInPacific();
      const currentTimeString = formatInPacific(currentPacificTime, 'HH:mm:ss');
      
      console.log('Fetching services for Pacific Time date:', todayPacific);
      console.log('Current Pacific time for filtering:', currentTimeString);
      
      // First try to get services for today (Pacific Time)
      let { data, error } = await supabase
        .from('service_providers')
        .select(`
          id,
          business_name,
          city,
          state,
          latitude,
          longitude,
          services!inner (
            id,
            name,
            price,
            duration_minutes,
            time_slots!inner (
              id,
              start_time,
              is_available
            )
          )
        `)
        .eq('services.time_slots.date', todayPacific)
        .eq('services.time_slots.is_available', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      // If no services for today, try yesterday (Pacific Time)
      if (!data || data.length === 0) {
        // Calculate yesterday in Pacific Time using utility function
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayPacific = formatInPacific(yesterday, 'yyyy-MM-dd');
        
        console.log('No services for today (Pacific), trying yesterday:', yesterdayPacific);
        
        const { data: yesterdayData, error: yesterdayError } = await supabase
          .from('service_providers')
          .select(`
            id,
            business_name,
            city,
            state,
            latitude,
            longitude,
            services!inner (
              id,
              name,
              price,
              duration_minutes,
              time_slots!inner (
                id,
                start_time,
                is_available
              )
            )
          `)
          .eq('services.time_slots.date', yesterdayPacific)
          .eq('services.time_slots.is_available', true)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);
          
        data = yesterdayData;
        error = yesterdayError;
      }

      // If still no data, get all providers with any services (fallback)
      if (!data || data.length === 0) {
        console.log('No services with time slots, getting all providers with services');
        
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('service_providers')
          .select(`
            id,
            business_name,
            city,
            state,
            latitude,
            longitude,
            services!inner (
              id,
              name,
              price,
              duration_minutes
            )
          `)
          .eq('services.is_available', true)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);
          
        if (fallbackError) {
          console.error('Error fetching fallback services:', fallbackError);
          throw fallbackError;
        }

        console.log('Fallback service providers data:', fallbackData);

        // Process fallback data without time slots
        const processedFallback = fallbackData?.map((provider) => {
          const availableServices = provider.services;
          if (availableServices.length === 0) return null;
          
          const mostAffordableService = availableServices.reduce((prev, current) => 
            (current.price < prev.price) ? current : prev
          );

          return {
            id: mostAffordableService.id,
            name: mostAffordableService.name,
            business_name: provider.business_name,
            time_available: 'Contact for availability',
            latitude: Number(provider.latitude),
            longitude: Number(provider.longitude),
            price: mostAffordableService.price,
            duration: mostAffordableService.duration_minutes,
            totalServices: availableServices.length
          };
        }).filter(Boolean) || [];

        console.log('Processed fallback services for map:', processedFallback);
        return processedFallback;
      }

      if (error) {
        console.error('Error fetching services:', error);
        throw error;
      }

      console.log('Raw service providers data:', data);

      // Group services by provider and show the most affordable service for each location
      const processedServices = data.map((provider) => {
        const availableServices = provider.services.filter(service => 
          service.time_slots.some(slot => slot.is_available)
        );
        
        if (availableServices.length === 0) return null;
        
        // Find the most affordable service
        const mostAffordableService = availableServices.reduce((prev, current) => 
          (current.price < prev.price) ? current : prev
        );
        
        const earliestTimeSlot = mostAffordableService.time_slots
          .sort((a, b) => a.start_time.localeCompare(b.start_time))[0];

        return {
          id: mostAffordableService.id,
          name: mostAffordableService.name,
          business_name: provider.business_name,
          time_available: earliestTimeSlot ? formatTimeInPacific(earliestTimeSlot.start_time) : 'Contact for availability',
          latitude: Number(provider.latitude),
          longitude: Number(provider.longitude),
          price: mostAffordableService.price,
          duration: mostAffordableService.duration_minutes,
          totalServices: availableServices.length
        };
      }).filter(Boolean);

      console.log('Processed services for map:', processedServices);
      return processedServices;
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Set up real-time subscription for time_slots changes
  useEffect(() => {
    const channel = supabase
      .channel('time-slots-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_slots'
        },
        () => {
          // Refetch services when time slots change
          queryClient.invalidateQueries({ queryKey: ['map-services'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    console.log('Map effect triggered:', { 
      hasContainer: !!mapContainer.current, 
      servicesLength: services.length, 
      hasToken: !!mapboxToken,
      token: mapboxToken ? `${mapboxToken.substring(0, 10)}...` : 'none'
    });
    
    if (!mapContainer.current || !services.length || !mapboxToken) {
      console.log('Map initialization skipped - missing requirements');
      return;
    }

    console.log('Initializing Mapbox map...');
    
    // Initialize map with proper configuration
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12', // Use the latest streets style
      center: [-118.2437, 34.0522], // Center on Los Angeles
      zoom: 10, // Closer zoom for LA area
      accessToken: mapboxToken
    });

    console.log('Map created successfully');

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Create bounds to fit all markers
    const bounds = new mapboxgl.LngLatBounds();

    // Add markers for each service
    services.forEach(service => {
      const markerElement = document.createElement('div');
      markerElement.className = 'cursor-pointer';
      markerElement.innerHTML = `
        <div class="w-8 h-8 bg-primary rounded-full border-2 border-background shadow-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
          </svg>
        </div>
      `;

      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([service.longitude, service.latitude])
        .addTo(map.current!);

      // Add click event to marker
      markerElement.addEventListener('click', () => {
        setSelectedService(service);
        if (onServiceClick) {
          onServiceClick(service.id);
        }
      });

      markersRef.current.push(marker);
      bounds.extend([service.longitude, service.latitude]);
    });

    // Fit map to show all markers
    if (services.length > 0) {
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 12
      });
    }

    return () => {
      map.current?.remove();
    };
  }, [services, onServiceClick, mapboxToken]);

  if (isMobile) {
    return (
      <div className="relative w-full h-64 bg-card rounded-lg overflow-hidden border shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          </div>
        ) : (
          <>
            <div ref={mapContainer} className="absolute inset-0" />
            
            {selectedService && (
              <div className="absolute top-2 left-2 right-2 z-10">
                <Card className="shadow-lg">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{selectedService.name}</h3>
                        <div className="flex items-center gap-1 text-muted-foreground mt-1">
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          <span className="text-xs truncate">{selectedService.business_name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-primary mt-1">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="text-xs font-medium">{selectedService.time_available}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-bold">${selectedService.price}</span>
                          <span className="text-xs text-muted-foreground">{selectedService.duration} min</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedService(null)}
                        className="ml-2 h-6 w-6 p-0 flex-shrink-0"
                      >
                        ×
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <div className="absolute bottom-2 right-2 z-10">
              <div className="bg-background/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs">
                <span className="text-muted-foreground">{services.length} locations</span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-80 lg:h-96 bg-card rounded-lg overflow-hidden border shadow-sm">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </div>
      ) : (
        <>
          <div ref={mapContainer} className="absolute inset-0" />
          
          {selectedService && (
            <div className="absolute top-4 left-4 z-10">
              <Card className="w-72 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{selectedService.name}</h3>
                      <div className="flex items-center gap-1 text-muted-foreground mt-1">
                        <Building2 className="h-4 w-4" />
                        <span className="text-sm">{selectedService.business_name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-primary mt-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">{selectedService.time_available}</span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-lg font-bold">${selectedService.price}</span>
                        <span className="text-sm text-muted-foreground">{selectedService.duration} min</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedService(null)}
                      className="ml-2"
                    >
                      ×
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
            <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2 items-end">
              <FixCoordinatesButton />
              <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm">
                <span className="text-muted-foreground">{services.length} locations available today</span>
              </div>
            </div>
        </>
      )}
    </div>
  );
};

export default InteractiveMap;