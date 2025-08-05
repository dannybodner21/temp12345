import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ServiceCard } from "./ServiceCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getTodayInPacific, formatInPacific } from "@/lib/timezone";
import { GoogleMapsModal } from "./GoogleMapsModal";
import { ServiceFilters, FilterState } from "./ServiceFilters";
import { useFilteredServices } from "@/hooks/useFilteredServices";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, Filter } from "lucide-react";
import { useState, useEffect } from "react";

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

export function ServiceGrid() {
  const { toast } = useToast();
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<{ name: string; url: string } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    distance: null,
    timeOfDay: [],
    sortBy: 'soonest'
  });

  const { data: services, isLoading, error, refetch } = useQuery({
    queryKey: ["services-today"],
    queryFn: async () => {
      // First get services with basic info
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select(`
          *,
          service_providers!inner (business_name, google_maps_url, instagram_handle, instagram_url, share_instagram)
        `)
        .eq("is_available", true)
        .order("created_at", { ascending: false });

      if (servicesError) throw servicesError;

      // Get categories for all services
      const serviceIds = servicesData?.map(s => s.id) || [];
      const { data: mappingsData } = await supabase
        .from("service_category_mappings")
        .select("service_id, category_id")
        .in("service_id", serviceIds);

      const { data: categoriesData } = await supabase
        .from("service_categories")
        .select("id, name");

      // Get time slots for each service (today and next 7 days)
      const servicesWithTimeSlots = await Promise.all(
        (servicesData || []).map(async (service) => {
          const today = getTodayInPacific();
          // Use Pacific Time for future date calculations too
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          const endDate = formatInPacific(nextWeek, 'yyyy-MM-dd'); // Show next week in Pacific Time
          
          const { data: timeSlots } = await supabase
            .from("time_slots")
            .select("id, start_time, end_time, date")
            .eq("service_id", service.id)
            .eq("is_available", true)
            .gte("date", today)
            .lte("date", endDate)
            .order("date")
            .order("start_time");

          // Get categories for this service
          const serviceMappings = mappingsData?.filter(mapping => mapping.service_id === service.id) || [];
          const serviceCategories = serviceMappings
            .map(mapping => categoriesData?.find(cat => cat.id === mapping.category_id))
            .filter(Boolean) as { id: string; name: string }[];

          return {
            ...service,
            time_slots: timeSlots || [],
            categories: serviceCategories
          };
        })
      );

      // Filter to only show services with available time slots today
      const today = getTodayInPacific();
      const currentPacificTime = formatInPacific(new Date(), 'HH:mm:ss');
      
      const servicesWithTodayAvailability = servicesWithTimeSlots.filter(service => {
        const todaySlots = service.time_slots?.filter(slot => {
          if (slot.date !== today) return false;
          // Filter out past time slots for today
          return slot.start_time > currentPacificTime;
        }) || [];
        return todaySlots.length > 0;
      });

      return servicesWithTodayAvailability as Service[];
    },
  });

  // Apply filters and sorting to the fetched services
  const filteredServices = useFilteredServices(services || [], filters, userLocation);

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

  const handleBookService = async (serviceId: string, timeSlotId: string) => {
    try {
      // Create the booking
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          service_id: serviceId,
          time_slot_id: timeSlotId,
          user_id: "temp-user-id", // This should be replaced with actual auth user ID
          total_price: 0, // This should be the actual service price
          status: "pending"
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Mark the time slot as unavailable
      const { error: timeSlotError } = await supabase
        .from("time_slots")
        .update({ is_available: false })
        .eq("id", timeSlotId);

      if (timeSlotError) throw timeSlotError;

      toast({
        title: "Booking Successful",
        description: "Your appointment has been booked successfully.",
      });

      // Refetch services to update the UI
      window.location.reload();
      
    } catch (error) {
      console.error("Booking error:", error);
      toast({
        title: "Booking Failed",
        description: "There was an error booking your appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBusinessNameClick = (businessName: string, googleMapsUrl?: string) => {
    if (googleMapsUrl) {
      setSelectedBusiness({ name: businessName, url: googleMapsUrl });
      setIsMapModalOpen(true);
    }
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load services. Please try again.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
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
    );
  }

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      categories: [],
      distance: null,
      timeOfDay: [],
      sortBy: 'soonest'
    });
  };

  if (!services?.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No services available at the moment.</p>
      </div>
    );
  }

  if (!filteredServices?.length) {
    return (
      <>
        {/* Filters */}
        <div className="mb-8">
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2 mb-4">
                <Filter className="h-4 w-4" />
                Filters & Sort
                <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ServiceFilters 
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onClearFilters={handleClearFilters}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
        
        <div className="text-center py-8">
          <p className="text-muted-foreground">No services match your current filters.</p>
          <Button variant="outline" onClick={handleClearFilters} className="mt-4">
            Clear Filters
          </Button>
        </div>
      </>
    );
  }

  // Group filtered services by category
  const servicesByCategory = filteredServices.reduce((acc, service) => {
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
    <>
      {/* Filters Toggle */}
      <div className="mb-8">
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4" />
              Filters & Sort
              <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ServiceFilters 
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>

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
                    category: service.categories?.[0], // Use first category for backward compatibility
                    provider: service.service_providers,
                    availableTimes: service.time_slots,
                  }}
                  onBook={handleBookService}
                  onBusinessNameClick={
                    service.service_providers?.google_maps_url
                      ? () => handleBusinessNameClick(
                          service.service_providers?.business_name || "",
                          service.service_providers?.google_maps_url
                        )
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <GoogleMapsModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        businessName={selectedBusiness?.name || ""}
        googleMapsUrl={selectedBusiness?.url || ""}
      />
    </>
  );
}