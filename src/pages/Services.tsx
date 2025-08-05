import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ServiceCard } from "@/components/ServiceCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getTodayInPacific, getNowInPacific, formatInPacific } from "@/lib/timezone";
import { GoogleMapsModal } from "@/components/GoogleMapsModal";
import { ServiceFilters, FilterState } from "@/components/ServiceFilters";
import { useFilteredServices } from "@/hooks/useFilteredServices";

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

export default function Services() {
  const { category } = useParams();
  const navigate = useNavigate();
  const [googleMapsModal, setGoogleMapsModal] = useState<{
    isOpen: boolean;
    businessName: string;
    googleMapsUrl: string;
  }>({ isOpen: false, businessName: "", googleMapsUrl: "" });
  const { toast } = useToast();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [filters, setFilters] = useState<FilterState>({
    categories: category ? [category] : [],
    distance: null,
    timeOfDay: [],
    sortBy: 'soonest'
  });

  // Check if user came from homepage by looking at the URL
  // If no category is specified, assume they came from homepage "Book Today"
  const cameFromHomepage = !category;

  // Get user's location for distance filtering and sorting
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log("Location access denied or unavailable:", error);
        }
      );
    }
  }, []);

  // Update filters when category changes from URL
  useEffect(() => {
    if (category && !filters.categories.includes(category)) {
      setFilters(prev => ({ ...prev, categories: [category] }));
    }
  }, [category]);

  const { data: services, isLoading, error } = useQuery({
    queryKey: ["services", category],
    staleTime: 0, // Always fetch fresh data to ensure availability is current
    queryFn: async () => {
      // Get all services (we'll filter by category client-side now)
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select(`
          *,
          service_providers (business_name, google_maps_url, instagram_handle, instagram_url, share_instagram, phone, email, address, city, state, zip_code, latitude, longitude)
        `)
        .eq("is_available", true)
        .order("created_at", { ascending: false });

      if (servicesError) throw servicesError;

      // Get categories for all services
      const serviceIds = servicesData?.map(s => s.id) || [];
      const { data: allMappingsData } = await supabase
        .from("service_category_mappings")
        .select("service_id, category_id")
        .in("service_id", serviceIds);

      const { data: categoriesData } = await supabase
        .from("service_categories")
        .select("id, name");

      // Get time slots for each service (today only, filtering out past times)
      const currentPacificTime = getNowInPacific();
      const todayPacific = getTodayInPacific();
      const currentTimeString = formatInPacific(currentPacificTime, 'HH:mm:ss');
      
      console.log('Current Pacific time:', formatInPacific(currentPacificTime, 'yyyy-MM-dd HH:mm:ss zzz'));
      console.log('Today Pacific date:', todayPacific);
      console.log('Current time for filtering:', currentTimeString);
      
      const servicesWithTimeSlots = await Promise.all(
        (servicesData || []).map(async (service) => {
          const { data: timeSlots } = await supabase
            .from("time_slots")
            .select("id, start_time, end_time, date")
            .eq("service_id", service.id)
            .eq("is_available", true)
            .eq("date", todayPacific)
            .order("start_time");

          // Filter out past time slots for today
          const availableTimeSlots = (timeSlots || []).filter(slot => {
            // Only filter if it's today - if it's a future date, keep all slots
            if (slot.date === todayPacific) {
              // Compare time slots with current Pacific time
              return slot.start_time > currentTimeString;
            }
            return true; // Keep all slots for future dates
          });

          console.log(`Service ${service.name}: ${timeSlots?.length || 0} total slots, ${availableTimeSlots.length} available after filtering past times`);

          // Get categories for this service
          const serviceMappings = allMappingsData?.filter(mapping => mapping.service_id === service.id) || [];
          const serviceCategories = serviceMappings
            .map(mapping => categoriesData?.find(cat => cat.id === mapping.category_id))
            .filter(Boolean) as { id: string; name: string }[];

          return {
            ...service,
            time_slots: availableTimeSlots,
            service_categories: serviceCategories[0], // For backward compatibility
            categories: serviceCategories
          };
        })
      );

      return servicesWithTimeSlots as Service[];
    },
  });

  // Apply filters and sorting to the fetched services
  const filteredServices = useFilteredServices(services || [], filters, userLocation);
  
  // Only show services with available time slots
  const servicesWithAvailability = filteredServices.filter(service => 
    service.time_slots && service.time_slots.length > 0
  );

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    // Update URL if categories filter changes
    if (newFilters.categories.length === 1 && newFilters.categories[0] !== category) {
      navigate(`/services/${newFilters.categories[0]}`, { replace: true });
    } else if (newFilters.categories.length === 0 && category) {
      navigate('/services', { replace: true });
    }
  };

  const handleClearFilters = () => {
    setFilters({
      categories: [],
      distance: null,
      timeOfDay: [],
      sortBy: 'soonest'
    });
    navigate('/services', { replace: true });
  };

  const handleBookService = (serviceId: string) => {
    toast({
      title: "Booking Flow",
      description: "This would navigate to the booking checkout where the booking fee will be displayed.",
    });
  };

  const handleBackNavigation = () => {
    if (cameFromHomepage) {
      navigate("/");
    } else {
      navigate("/categories");
    }
  };

  const handleBusinessNameClick = (businessName: string, googleMapsUrl?: string) => {
    if (googleMapsUrl) {
      setGoogleMapsModal({
        isOpen: true,
        businessName,
        googleMapsUrl
      });
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 pt-24 pb-8">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to load services. Please try again.</p>
            <Button onClick={handleBackNavigation} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {cameFromHomepage ? "Back to Home" : "Back to Categories"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 pt-24 pb-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackNavigation}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {filters.categories.length === 1 ? `${filters.categories[0]} Services` : 'All Appointments Available Today'}
              </h1>
              <p className="text-muted-foreground flex items-center gap-1">
                {userLocation && (
                  <>
                    <MapPin className="h-4 w-4" />
                    Location detected for distance sorting
                  </>
                )}
                {!userLocation && "Available services for today"}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <ServiceFilters 
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-video w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : !servicesWithAvailability?.length ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-2">
              {!services?.length 
                ? "No services available at the moment." 
                : "No services match your current filters."}
            </p>
            {services?.length && !servicesWithAvailability?.length && (
              <Button 
                variant="outline" 
                onClick={handleClearFilters}
                className="mt-4"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                Showing {servicesWithAvailability.length} of {services?.length || 0} services
              </p>
            </div>
            
            {/* Group services by category */}
            {(() => {
              const servicesByCategory = servicesWithAvailability.reduce((acc, service) => {
                let categoryName = service.categories?.[0]?.name || 'Other Services';
                // Standardize "Facial" to "Facials & Skincare"
                if (categoryName.toLowerCase() === 'facial' || categoryName.toLowerCase() === 'facials') {
                  categoryName = 'Facials & Skincare';
                }
                if (!acc[categoryName]) {
                  acc[categoryName] = [];
                }
                acc[categoryName].push(service);
                return acc;
              }, {} as Record<string, Service[]>);

              // Sort categories alphabetically, but put "Other Services" last
              const sortedCategories = Object.keys(servicesByCategory).sort((a, b) => {
                if (a === 'Other Services') return 1;
                if (b === 'Other Services') return -1;
                return a.localeCompare(b);
              });

              return (
                <div className="space-y-12">
                  {sortedCategories.map((categoryName) => (
                    <div key={categoryName}>
                      <h3 className="text-2xl font-bold text-foreground mb-6 border-b border-border pb-2">
                        {categoryName.toUpperCase()}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {servicesByCategory[categoryName].map((service) => (
                          <ServiceCard
                            key={service.id}
                            service={{
                              ...service,
                              price_per_unit: service.price_per_unit || null,
                              original_price_per_unit: service.original_price_per_unit || null,
                              category: service.service_categories,
                              provider: service.service_providers,
                              availableTimes: service.time_slots,
                            }}
                            onBook={handleBookService}
                            onBusinessNameClick={() => handleBusinessNameClick(
                              service.service_providers?.business_name || '',
                              service.service_providers?.google_maps_url
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </>
        )}
      </div>
      
      <GoogleMapsModal
        isOpen={googleMapsModal.isOpen}
        onClose={() => setGoogleMapsModal(prev => ({ ...prev, isOpen: false }))}
        businessName={googleMapsModal.businessName}
        googleMapsUrl={googleMapsModal.googleMapsUrl}
      />
    </div>
  );
}