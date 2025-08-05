import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, MapPin, Phone, Mail, Building, Settings, Clock, DollarSign, Plus, Edit, Calendar, Eye, EyeOff, Trash2, CreditCard, Users, BookOpen, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StripeAccountSync } from "@/components/StripeAccountSync";
import { ManualAvailabilityInput } from "@/components/ManualAvailabilityInput";

interface ProviderProfile {
  id: string;
  user_id: string;
  business_name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone?: string;
  email?: string;
  website_url?: string;
  google_maps_url?: string;
  instagram_url?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  open_days?: string[];
}

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  price_per_unit?: number;
  original_price: number | null;
  original_price_per_unit?: number | null;
  duration_minutes: number;
  provider_id: string;
  is_available: boolean;
}

interface TimeSlot {
  id: string;
  service_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const AdminProviders = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<ProviderProfile | null>(null);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isTimeSlotDialogOpen, setIsTimeSlotDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isOpenDaysDialogOpen, setIsOpenDaysDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderProfile | null>(null);
  const [openDaysForm, setOpenDaysForm] = useState<string[]>([]);
  const [editingBusinessName, setEditingBusinessName] = useState<{ providerId: string; name: string } | null>(null);
  const [editingGoogleMapsUrl, setEditingGoogleMapsUrl] = useState<{ providerId: string; url: string } | null>(null);
  const [editingInstagramUrl, setEditingInstagramUrl] = useState<{ providerId: string; url: string } | null>(null);
  const [editingStripeAccountId, setEditingStripeAccountId] = useState<{ providerId: string; accountId: string } | null>(null);
  const [stripeConnections, setStripeConnections] = useState<Record<string, { stripe_account_id: string; account_status: string }>>({});
  const { toast } = useToast();

  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    price: "",
    price_per_unit: "",
    discount_percentage: "",
    duration_minutes: "",
    duration_unit: "minutes" as "hours" | "minutes",
    category_ids: [] as string[]
  });

  const [timeSlotForm, setTimeSlotForm] = useState({
    service_id: "",
    date: "",
    start_time: "",
    duration_minutes: "60"
  });

  const [servicesUrl, setServicesUrl] = useState("");
  const [isScrapingServices, setIsScrapingServices] = useState(false);
  const [scrapedServices, setScrapedServices] = useState<any[]>([]);

  useEffect(() => {
    fetchProviders();
    fetchCategories();
    fetchStripeConnections();
  }, []);

  const fetchProviders = async () => {
    console.log('Fetching providers...');
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('*, open_days')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Providers fetched successfully:', data?.length, 'providers');
      setProviders(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch providers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("service_categories")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    }
  };

  const fetchStripeConnections = async () => {
    try {
      const { data, error } = await supabase
        .from("provider_stripe_connections")
        .select("provider_id, stripe_account_id, account_status");

      if (error) throw error;
      
      const connectionsMap = (data || []).reduce((acc, connection) => {
        acc[connection.provider_id] = {
          stripe_account_id: connection.stripe_account_id,
          account_status: connection.account_status
        };
        return acc;
      }, {} as Record<string, { stripe_account_id: string; account_status: string }>);
      
      setStripeConnections(connectionsMap);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch Stripe connections",
        variant: "destructive",
      });
    }
  };

  const fetchProviderServices = async (providerId: string) => {
    console.log('Fetching services for provider:', providerId);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', providerId)
        .order('name');

      if (error) throw error;
      console.log('Fetched services:', data);
      setServices(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch services",
        variant: "destructive",
      });
    }
  };

  const fetchServiceTimeSlots = async (serviceId?: string) => {
    try {
      let query = supabase
        .from('time_slots')
        .select('*')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (serviceId) {
        query = query.eq('service_id', serviceId);
      } else if (selectedProvider) {
        // Get all time slots for this provider's services
        const { data: providerServices } = await supabase
          .from('services')
          .select('id')
          .eq('provider_id', selectedProvider.id);
        
        if (providerServices && providerServices.length > 0) {
          const serviceIds = providerServices.map(s => s.id);
          query = query.in('service_id', serviceIds);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setTimeSlots(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch time slots",
        variant: "destructive",
      });
    }
  };

  const updateProviderVerification = async (providerId: string, isVerified: boolean) => {
    try {
      const { error } = await supabase
        .from('service_providers')
        .update({ is_verified: isVerified })
        .eq('id', providerId);

      if (error) throw error;

      setProviders(providers.map(provider => 
        provider.id === providerId 
          ? { ...provider, is_verified: isVerified }
          : provider
      ));

      toast({
        title: "Success",
        description: `Provider ${isVerified ? 'verified' : 'unverified'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update provider verification",
        variant: "destructive",
      });
    }
  };

  const updateProviderOpenDays = async (providerId: string, openDays: string[]) => {
    console.log('Updating provider open days:', { providerId, openDays });
    
    try {
      // First, let's verify the provider exists
      const { data: existingProvider, error: checkError } = await supabase
        .from('service_providers')
        .select('id, open_days')
        .eq('id', providerId)
        .single();

      if (checkError) {
        console.error('Provider lookup error:', checkError);
        throw new Error('Provider not found');
      }

      console.log('Provider exists:', existingProvider);

      // Now update the provider
      const { data, error } = await supabase
        .from('service_providers')
        .update({ open_days: openDays })
        .eq('id', providerId)
        .select('id, open_days')
        .single();

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      console.log('Database update successful:', data);

      // Update local state with the actual data from the database
      setProviders(prevProviders => 
        prevProviders.map(provider => 
          provider.id === providerId 
            ? { ...provider, open_days: data.open_days }
            : provider
        )
      );

      // Also update the editing provider state if it's the same provider
      if (editingProvider && editingProvider.id === providerId) {
        setEditingProvider(prev => prev ? { ...prev, open_days: data.open_days } : null);
      }

      toast({
        title: "Success",
        description: "Provider open days updated successfully",
      });
    } catch (error: any) {
      console.error('Failed to update provider open days:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update provider open days",
        variant: "destructive",
      });
    }
  };

  const handleEditOpenDays = (provider: ProviderProfile) => {
    setEditingProvider(provider);
    setOpenDaysForm(provider.open_days || []);
    setIsOpenDaysDialogOpen(true);
  };

  const handleOpenDaysSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvider) return;

    console.log('Submitting open days form:', { providerId: editingProvider.id, openDays: openDaysForm });

    await updateProviderOpenDays(editingProvider.id, openDaysForm);
    
    // Only close dialog and reset form after successful update
    setIsOpenDaysDialogOpen(false);
    setEditingProvider(null);
    setOpenDaysForm([]);
  };

  const toggleOpenDay = (day: string) => {
    setOpenDaysForm(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const updateBusinessName = async (providerId: string, newName: string) => {
    if (!newName.trim()) {
      toast({
        title: "Error",
        description: "Business name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('service_providers')
        .update({ business_name: newName.trim() })
        .eq('id', providerId);

      if (error) throw error;

      setProviders(providers.map(provider => 
        provider.id === providerId 
          ? { ...provider, business_name: newName.trim() }
          : provider
      ));

      // Also update selected provider if it's the same
      if (selectedProvider && selectedProvider.id === providerId) {
        setSelectedProvider(prev => prev ? { ...prev, business_name: newName.trim() } : null);
      }

      setEditingBusinessName(null);

      toast({
        title: "Success",
        description: "Business name updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update business name",
        variant: "destructive",
      });
    }
  };

  const handleBusinessNameEdit = (provider: ProviderProfile) => {
    setEditingBusinessName({ providerId: provider.id, name: provider.business_name });
  };

  const handleBusinessNameSave = () => {
    if (editingBusinessName) {
      updateBusinessName(editingBusinessName.providerId, editingBusinessName.name);
    }
  };

  const handleBusinessNameCancel = () => {
    setEditingBusinessName(null);
  };

  const updateGoogleMapsUrl = async (providerId: string, newUrl: string) => {
    try {
      const { error } = await supabase
        .from('service_providers')
        .update({ google_maps_url: newUrl.trim() || null })
        .eq('id', providerId);

      if (error) throw error;

      setProviders(providers.map(provider => 
        provider.id === providerId 
          ? { ...provider, google_maps_url: newUrl.trim() || null }
          : provider
      ));

      // Also update selected provider if it's the same
      if (selectedProvider && selectedProvider.id === providerId) {
        setSelectedProvider(prev => prev ? { ...prev, google_maps_url: newUrl.trim() || null } : null);
      }

      setEditingGoogleMapsUrl(null);

      toast({
        title: "Success",
        description: "Google Maps URL updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update Google Maps URL",
        variant: "destructive",
      });
    }
  };

  const updateInstagramUrl = async (providerId: string, newUrl: string) => {
    try {
      const { error } = await supabase
        .from('service_providers')
        .update({ instagram_url: newUrl.trim() || null })
        .eq('id', providerId);

      if (error) throw error;

      setProviders(providers.map(provider => 
        provider.id === providerId 
          ? { ...provider, instagram_url: newUrl.trim() || null }
          : provider
      ));

      // Also update selected provider if it's the same
      if (selectedProvider && selectedProvider.id === providerId) {
        setSelectedProvider(prev => prev ? { ...prev, instagram_url: newUrl.trim() || null } : null);
      }

      setEditingInstagramUrl(null);

      toast({
        title: "Success",
        description: "Instagram URL updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update Instagram URL",
        variant: "destructive",
      });
    }
  };

  const updateStripeAccountId = async (providerId: string, stripeAccountId: string) => {
    try {
      // Use the sync-existing-stripe-accounts function
      const { data, error } = await supabase.functions.invoke('sync-existing-stripe-accounts', {
        body: {
          provider_id: providerId,
          stripe_account_id: stripeAccountId.trim()
        }
      });

      if (error) throw error;

      // Update local state
      setStripeConnections(prev => ({
        ...prev,
        [providerId]: {
          stripe_account_id: stripeAccountId.trim(),
          account_status: data.account_status || 'active'
        }
      }));

      setEditingStripeAccountId(null);

      toast({
        title: "Success",
        description: "Stripe Account ID updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update Stripe Account ID",
        variant: "destructive",
      });
    }
  };

  const handleStripeAccountIdEdit = (provider: ProviderProfile) => {
    const currentStripeId = stripeConnections[provider.id]?.stripe_account_id || '';
    setEditingStripeAccountId({ providerId: provider.id, accountId: currentStripeId });
  };

  const handleStripeAccountIdSave = () => {
    if (editingStripeAccountId) {
      updateStripeAccountId(editingStripeAccountId.providerId, editingStripeAccountId.accountId);
    }
  };

  const handleStripeAccountIdCancel = () => {
    setEditingStripeAccountId(null);
  };

  const toggleTimeSlotAvailability = async (timeSlotId: string, currentAvailability: boolean) => {
    try {
      const { error } = await supabase
        .from('time_slots')
        .update({ is_available: !currentAvailability })
        .eq('id', timeSlotId);

      if (error) throw error;

      setTimeSlots(timeSlots.map(slot => 
        slot.id === timeSlotId 
          ? { ...slot, is_available: !currentAvailability }
          : slot
      ));

      toast({
        title: "Success",
        description: `Time slot ${!currentAvailability ? 'shown' : 'hidden'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update time slot availability",
        variant: "destructive",
      });
    }
  };

  const deleteTimeSlot = async (timeSlotId: string) => {
    if (!confirm('Are you sure you want to permanently delete this time slot?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('time_slots')
        .delete()
        .eq('id', timeSlotId);

      if (error) throw error;

      setTimeSlots(timeSlots.filter(slot => slot.id !== timeSlotId));

      toast({
        title: "Success",
        description: "Time slot deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete time slot",
        variant: "destructive",
      });
    }
  };

  const handleGoogleMapsUrlEdit = (provider: ProviderProfile) => {
    setEditingGoogleMapsUrl({ providerId: provider.id, url: provider.google_maps_url || '' });
  };

  const handleGoogleMapsUrlSave = () => {
    if (editingGoogleMapsUrl) {
      updateGoogleMapsUrl(editingGoogleMapsUrl.providerId, editingGoogleMapsUrl.url);
    }
  };

  const handleGoogleMapsUrlCancel = () => {
    setEditingGoogleMapsUrl(null);
  };

  const handleInstagramUrlEdit = (provider: ProviderProfile) => {
    setEditingInstagramUrl({ providerId: provider.id, url: provider.instagram_url || '' });
  };

  const handleInstagramUrlSave = () => {
    if (editingInstagramUrl) {
      updateInstagramUrl(editingInstagramUrl.providerId, editingInstagramUrl.url);
    }
  };

  const handleInstagramUrlCancel = () => {
    setEditingInstagramUrl(null);
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    // Add validation
    if (!serviceForm.name.trim()) {
      toast({
        title: "Error",
        description: "Service name is required",
        variant: "destructive",
      });
      return;
    }

    // Validate that either price or price_per_unit is provided
    if (!serviceForm.price && !serviceForm.price_per_unit) {
      toast({
        title: "Error",
        description: "Please provide either a regular price or a price per unit",
        variant: "destructive",
      });
      return;
    }

    if (serviceForm.price && parseFloat(serviceForm.price) <= 0) {
      toast({
        title: "Error", 
        description: "Price must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (serviceForm.price_per_unit && parseFloat(serviceForm.price_per_unit) <= 0) {
      toast({
        title: "Error", 
        description: "Price per unit must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!serviceForm.duration_minutes || parseInt(serviceForm.duration_minutes) <= 0) {
      toast({
        title: "Error",
        description: "Valid duration is required", 
        variant: "destructive",
      });
      return;
    }

    const inputDiscountPercentage = parseFloat(serviceForm.discount_percentage) || 0;
    const platformFeePercentage = 7; // Lately keeps 7%
    const effectiveDiscountPercentage = Math.max(0, inputDiscountPercentage - platformFeePercentage);

    // Convert duration to minutes if specified in hours
    const durationInMinutes = serviceForm.duration_unit === "hours" 
      ? parseFloat(serviceForm.duration_minutes) * 60 
      : parseInt(serviceForm.duration_minutes);

    // Calculate final prices based on which field is used
    let finalPrice = null;
    let finalPricePerUnit = null;
    let originalPrice = null;
    let originalPricePerUnit = null;

    if (serviceForm.price) {
      const price = parseFloat(serviceForm.price);
      originalPrice = inputDiscountPercentage > 0 ? price : null;
      finalPrice = price * (1 - effectiveDiscountPercentage / 100);
    }

    if (serviceForm.price_per_unit) {
      const pricePerUnit = parseFloat(serviceForm.price_per_unit);
      originalPricePerUnit = inputDiscountPercentage > 0 ? pricePerUnit : null;
      finalPricePerUnit = pricePerUnit * (1 - effectiveDiscountPercentage / 100);
    }

    const serviceData = {
      name: serviceForm.name.trim(),
      description: serviceForm.description.trim() || null,
      price: finalPrice,
      price_per_unit: finalPricePerUnit,
      original_price: originalPrice,
      original_price_per_unit: originalPricePerUnit,
      duration_minutes: durationInMinutes,
      provider_id: selectedProvider.id,
      is_available: true
    };

    console.log('Submitting service data:', serviceData);

    try {
      let serviceId: string;

      if (editingService) {
        console.log('Updating service with ID:', editingService.id, 'for provider:', selectedProvider.business_name);
        const { data: updatedData, error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id)
          .select();
        if (error) throw error;
        
        serviceId = editingService.id;
        
        // Delete existing category mappings
        await supabase
          .from("service_category_mappings")
          .delete()
          .eq("service_id", serviceId);

        console.log('Service update successful:', updatedData);
        toast({ title: "Service updated successfully!" });
      } else {
        const { data, error } = await supabase
          .from('services')
          .insert([serviceData])
          .select("id")
          .single();
        if (error) throw error;
        serviceId = data.id;
        toast({ title: "Service created successfully!" });
      }

      // Insert new category mappings
      if (serviceForm.category_ids.length > 0) {
        const categoryMappings = serviceForm.category_ids.map(categoryId => ({
          service_id: serviceId,
          category_id: categoryId
        }));

        const { error: mappingError } = await supabase
          .from("service_category_mappings")
          .insert(categoryMappings);

        if (mappingError) throw mappingError;
      }

      // Refresh services data to ensure UI updates
      await fetchProviderServices(selectedProvider.id);
      
      // Also refresh the main providers list to ensure everything is in sync
      await fetchProviders();
      
      setIsServiceDialogOpen(false);
      setServiceForm({ name: "", description: "", price: "", price_per_unit: "", discount_percentage: "", duration_minutes: "", duration_unit: "minutes", category_ids: [] });
      setEditingService(null);
    } catch (error: any) {
      console.error('Service creation error:', error);
      toast({
        title: "Error",
        description: `Failed to save service: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleTimeSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    const durationMinutes = parseInt(timeSlotForm.duration_minutes);
    const startTime = timeSlotForm.start_time;
    const [hours, minutes] = startTime.split(':').map(Number);
    const endTime = `${String(Math.floor((hours * 60 + minutes + durationMinutes) / 60)).padStart(2, '0')}:${String((hours * 60 + minutes + durationMinutes) % 60).padStart(2, '0')}`;

    const timeSlotData = {
      service_id: timeSlotForm.service_id,
      date: timeSlotForm.date,
      start_time: startTime,
      end_time: endTime,
      is_available: true
    };

    try {
      const { error } = await supabase
        .from('time_slots')
        .insert([timeSlotData]);

      if (error) throw error;

      toast({ title: "Time slot added successfully!" });
      await fetchServiceTimeSlots();
      setIsTimeSlotDialogOpen(false);
      setTimeSlotForm({ service_id: "", date: "", start_time: "", duration_minutes: "" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add time slot",
        variant: "destructive",
      });
    }
  };

  const handleManageProvider = async (provider: ProviderProfile) => {
    setSelectedProvider(provider);
    await Promise.all([
      fetchProviderServices(provider.id),
      fetchServiceTimeSlots()
    ]);
  };

  const editService = async (service: Service) => {
    setEditingService(service);
    
    // Fetch current categories for this service
    const { data: serviceCategoryMappings } = await supabase
      .from("service_category_mappings")
      .select("category_id")
      .eq("service_id", service.id);
    
    const currentCategoryIds = serviceCategoryMappings?.map(mapping => mapping.category_id) || [];
    
    // Calculate discount percentage for regular price
    const regularDiscountPercentage = service.original_price && service.original_price > service.price
      ? Math.round(((service.original_price - service.price) / service.original_price) * 100)
      : 0;
    
    // Calculate discount percentage for price per unit
    const perUnitDiscountPercentage = service.original_price_per_unit && service.price_per_unit && service.original_price_per_unit > service.price_per_unit
      ? Math.round(((service.original_price_per_unit - service.price_per_unit) / service.original_price_per_unit) * 100)
      : 0;
    
    // Use the discount that exists (prioritize per unit if both exist)
    const effectiveDiscountPercentage = perUnitDiscountPercentage > 0 ? perUnitDiscountPercentage : regularDiscountPercentage;
    const originalInputDiscount = effectiveDiscountPercentage + 7; // Add back platform fee
    
    // Convert duration from minutes to hours if it makes sense
    const canDisplayAsHours = service.duration_minutes >= 30 && service.duration_minutes % 30 === 0;
    const displayDuration = canDisplayAsHours ? service.duration_minutes / 60 : service.duration_minutes;
    const displayUnit = canDisplayAsHours ? "hours" : "minutes";
    
    setServiceForm({
      name: service.name,
      description: service.description || "",
      price: (service.original_price || service.price)?.toString() || "",
      price_per_unit: (service.original_price_per_unit || service.price_per_unit)?.toString() || "",
      discount_percentage: originalInputDiscount.toString(),
      duration_minutes: displayDuration.toString(),
      duration_unit: displayUnit,
      category_ids: currentCategoryIds
    });
    setIsServiceDialogOpen(true);
  };

  const deleteService = async (serviceId: string, serviceName: string) => {
    if (!confirm(`Are you sure you want to delete "${serviceName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // First delete any time slots for this service
      const { error: timeSlotsError } = await supabase
        .from('time_slots')
        .delete()
        .eq('service_id', serviceId);

      if (timeSlotsError) {
        console.error('Error deleting time slots:', timeSlotsError);
        // Continue anyway - we'll delete the service and let constraints handle it
      }

      // Delete service category mappings
      const { error: categoryError } = await supabase
        .from('service_category_mappings')
        .delete()
        .eq('service_id', serviceId);

      if (categoryError) {
        console.error('Error deleting service categories:', categoryError);
        // Continue anyway
      }

      // Delete the service
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Service "${serviceName}" deleted successfully`,
      });

      // Refresh the services list
      if (selectedProvider) {
        await fetchProviderServices(selectedProvider.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to delete service: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const toggleServiceAvailability = async (serviceId: string, serviceName: string, currentAvailability: boolean) => {
    const newAvailability = !currentAvailability;
    
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_available: newAvailability })
        .eq('id', serviceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Service "${serviceName}" marked as ${newAvailability ? 'available' : 'unavailable'}`,
      });

      // Refresh the services list
      if (selectedProvider) {
        await fetchProviderServices(selectedProvider.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update service availability: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleScrapeServices = async () => {
    if (!selectedProvider || !servicesUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid services URL",
        variant: "destructive",
      });
      return;
    }

    setIsScrapingServices(true);
    setScrapedServices([]);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-services', {
        body: {
          url: servicesUrl.trim(),
          provider_id: selectedProvider.id
        }
      });

      if (error) {
        console.error('Scraping error:', error);
        throw error;
      }

      if (data?.success && data?.extracted_services) {
        setScrapedServices(data.extracted_services);
        toast({
          title: "Success",
          description: `Found ${data.services_found} services from the URL`,
        });
      } else {
        throw new Error(data?.error || 'Failed to scrape services');
      }
    } catch (error: any) {
      console.error('Error scraping services:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to scrape services from URL",
        variant: "destructive",
      });
    } finally {
      setIsScrapingServices(false);
    }
  };

  const handleImportScrapedService = async (scrapedService: any) => {
    if (!selectedProvider) return;

    const serviceData = {
      name: scrapedService.name,
      description: scrapedService.description || null,
      price: scrapedService.price || 0,
      original_price: null,
      duration_minutes: scrapedService.duration || 60,
      provider_id: selectedProvider.id,
      is_available: true
    };

    try {
      const { error } = await supabase
        .from('services')
        .insert([serviceData]);

      if (error) throw error;

      toast({
        title: "Service Imported",
        description: `Successfully imported "${scrapedService.name}"`,
      });

      await fetchProviderServices(selectedProvider.id);
      
      // Remove the imported service from scraped list
      setScrapedServices(prev => prev.filter(s => s !== scrapedService));
    } catch (error: any) {
      console.error('Error importing service:', error);
      toast({
        title: "Error",
        description: `Failed to import service: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Navigation */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-semibold">Admin Dashboard</h2>
            <nav className="flex items-center gap-4">
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/admin/providers')}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Providers
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/bookings')}
                className="flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Bookings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/sync-settings')}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Sync Settings
              </Button>
            </nav>
          </div>
        </div>
      </div>
      
      <div className="w-full max-w-full px-4 py-6 mx-auto overflow-hidden">
       <div className="mb-6">
         <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
           <div className="min-w-0">
             <h1 className="text-2xl sm:text-3xl font-bold truncate">Admin Dashboard</h1>
             <p className="text-sm text-muted-foreground">Manage providers, services, and time slots</p>
           </div>
           <Button
             variant="outline"
             onClick={() => window.location.href = '/admin/bookings'}
             className="flex items-center gap-2 flex-shrink-0 text-sm"
             size="sm"
           >
             <Calendar className="h-4 w-4" />
             <span className="hidden sm:inline">Manage Bookings</span>
             <span className="sm:hidden">Bookings</span>
           </Button>
         </div>
       </div>

      {!selectedProvider ? (
        <div className="space-y-4">
          <div className="w-full">
            <StripeAccountSync 
              providers={providers.map(p => ({ id: p.id, business_name: p.business_name }))} 
              onSyncComplete={fetchProviders}
            />
          </div>
          {providers.map((provider) => (
            <Card key={provider.id} className="w-full">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Building className="h-5 w-5 flex-shrink-0" />
                      {editingBusinessName?.providerId === provider.id ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                          <Input
                            value={editingBusinessName.name}
                            onChange={(e) => setEditingBusinessName(prev => 
                              prev ? { ...prev, name: e.target.value } : null
                            )}
                            className="h-8 text-base sm:text-lg font-semibold flex-1 min-w-0"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleBusinessNameSave();
                              if (e.key === 'Escape') handleBusinessNameCancel();
                            }}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={handleBusinessNameSave}
                            className="h-8 px-3"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleBusinessNameCancel}
                            className="h-8 px-3"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1">
                          <span className="truncate">{provider.business_name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleBusinessNameEdit(provider)}
                            className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant={provider.is_verified ? "default" : "secondary"}>
                        {provider.is_verified ? "Verified" : "Pending Verification"}
                      </Badge>
                      <Badge variant={provider.is_active ? "default" : "destructive"}>
                        {provider.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      onClick={() => handleManageProvider(provider)}
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto justify-start"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                    {!provider.is_verified && (
                      <Button
                        onClick={() => updateProviderVerification(provider.id, true)}
                        className="bg-green-600 hover:bg-green-700 w-full sm:w-auto justify-start"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Verify
                      </Button>
                    )}
                    {provider.is_verified && (
                      <Button
                        onClick={() => updateProviderVerification(provider.id, false)}
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto justify-start"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Unverify
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">{/* Better responsive breakpoint */}
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm break-words">
                        {provider.address}, {provider.city}, {provider.state} {provider.zip_code}
                      </span>
                    </div>
                    {provider.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm">{provider.phone}</span>
                      </div>
                    )}
                    {provider.email && (
                      <div className="flex items-start gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="text-sm break-all min-w-0">{provider.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 min-w-0">
                    <p className="text-sm text-muted-foreground">
                      <strong>User ID:</strong> 
                      <span className="break-all ml-1 font-mono text-xs">{provider.user_id}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Signed up:</strong> {new Date(provider.created_at).toLocaleDateString()}
                    </p>
                    {provider.description && (
                      <p className="text-sm">
                        <strong>Description:</strong> 
                        <span className="break-words ml-1">{provider.description}</span>
                      </p>
                     )}
                     {provider.website_url && (
                       <p className="text-sm">
                         <strong>Website:</strong>{" "}
                         <a 
                           href={provider.website_url} 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           className="text-primary hover:underline break-all"
                         >
                           {provider.website_url}
                         </a>
                       </p>
                      )}
                      {editingGoogleMapsUrl?.providerId === provider.id ? (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Google Maps URL:</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingGoogleMapsUrl.url}
                              onChange={(e) => setEditingGoogleMapsUrl(prev => 
                                prev ? { ...prev, url: e.target.value } : null
                              )}
                              placeholder="https://maps.app.goo.gl/..."
                              className="flex-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleGoogleMapsUrlSave();
                                if (e.key === 'Escape') handleGoogleMapsUrlCancel();
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={handleGoogleMapsUrlSave}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleGoogleMapsUrlCancel}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">Google Maps URL:</Label>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleGoogleMapsUrlEdit(provider)}
                              className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                          {provider.google_maps_url ? (
                            <a 
                              href={provider.google_maps_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-primary hover:underline break-all text-sm"
                            >
                              {provider.google_maps_url}
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not set</span>
                          )}
                        </div>
                       )}
                       
                       {/* Instagram URL editing */}
                       {editingInstagramUrl?.providerId === provider.id ? (
                         <div className="space-y-2 mt-4">
                           <Label className="text-sm font-medium">Instagram URL:</Label>
                           <div className="flex items-center gap-2">
                             <Input
                               value={editingInstagramUrl.url}
                               onChange={(e) => setEditingInstagramUrl(prev => 
                                 prev ? { ...prev, url: e.target.value } : null
                               )}
                               placeholder="https://www.instagram.com/username"
                               className="flex-1"
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter') {
                                   handleInstagramUrlSave();
                                 }
                                 if (e.key === 'Escape') {
                                   handleInstagramUrlCancel();
                                 }
                               }}
                             />
                             <Button
                               size="sm"
                               onClick={handleInstagramUrlSave}
                             >
                               <CheckCircle className="h-4 w-4" />
                             </Button>
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={handleInstagramUrlCancel}
                             >
                               <XCircle className="h-4 w-4" />
                             </Button>
                           </div>
                         </div>
                       ) : (
                         <div className="space-y-2 mt-4">
                           <div className="flex items-center gap-2">
                             <Label className="text-sm font-medium">Instagram URL:</Label>
                             <Button
                               size="sm"
                               variant="ghost"
                               onClick={() => handleInstagramUrlEdit(provider)}
                               className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                             >
                               <Edit className="h-3 w-3" />
                             </Button>
                           </div>
                           {provider.instagram_url ? (
                             <a 
                               href={provider.instagram_url} 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               className="text-primary hover:underline break-all text-sm"
                             >
                               {provider.instagram_url}
                             </a>
                           ) : (
                             <span className="text-sm text-muted-foreground">Not set</span>
                           )}
                         </div>
                        )}
                        
                        {/* Stripe Account ID editing */}
                        {editingStripeAccountId?.providerId === provider.id ? (
                          <div className="space-y-2 mt-4">
                            <Label className="text-sm font-medium">Stripe Account ID:</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingStripeAccountId.accountId}
                                onChange={(e) => setEditingStripeAccountId(prev => 
                                  prev ? { ...prev, accountId: e.target.value } : null
                                )}
                                placeholder="acct_1234567890"
                                className="flex-1"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleStripeAccountIdSave();
                                  }
                                  if (e.key === 'Escape') {
                                    handleStripeAccountIdCancel();
                                  }
                                }}
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={handleStripeAccountIdSave}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleStripeAccountIdCancel}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 mt-4">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm font-medium">Stripe Account ID:</Label>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStripeAccountIdEdit(provider)}
                                className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              {stripeConnections[provider.id]?.stripe_account_id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-mono text-green-600">
                                    {stripeConnections[provider.id].stripe_account_id}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {stripeConnections[provider.id].account_status}
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">Not set</span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-start gap-2 mt-2">
                       <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                       <div className="flex-1 min-w-0">
                         <p className="text-sm">
                           <strong>Open Days:</strong>{" "}
                           <span className="text-muted-foreground">
                             {provider.open_days && provider.open_days.length > 0 
                               ? provider.open_days.join(", ") 
                               : "Not set"}
                           </span>
                         </p>
                         <Button
                           size="sm"
                           variant="ghost"
                           onClick={() => handleEditOpenDays(provider)}
                           className="h-6 px-2 text-xs mt-1 -ml-2"
                         >
                           <Edit className="h-3 w-3 mr-1" />
                           Edit Days
                         </Button>
                       </div>
                     </div>
                   </div>
                 </div>
              </CardContent>
            </Card>
          ))}

          {providers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No providers found</p>
            </div>
          )}

          {/* Open Days Dialog */}
          <Dialog open={isOpenDaysDialogOpen} onOpenChange={setIsOpenDaysDialogOpen}>
            <DialogContent className="w-[95vw] max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Open Days</DialogTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Select the days when this provider is typically open for business contacts.
                </p>
              </DialogHeader>
              <form onSubmit={handleOpenDaysSubmit} className="space-y-4">
                <div className="space-y-3">
                  <Label>Select days the provider is typically open for business:</Label>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={day}
                        checked={openDaysForm.includes(day)}
                        onCheckedChange={() => toggleOpenDay(day)}
                      />
                      <Label htmlFor={day} className="text-sm font-normal">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsOpenDaysDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Save Changes
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-bold truncate">{selectedProvider.business_name}</h2>
                <p className="text-sm text-muted-foreground">Manage services and time slots</p>
              </div>
              <Button 
                onClick={() => setSelectedProvider(null)} 
                variant="outline" 
                size="sm"
                className="w-full sm:w-auto"
              >
                Back to Providers
              </Button>
            </div>
          </div>

          <Tabs defaultValue="services" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="timeslots">Time Slots</TabsTrigger>
            </TabsList>

            <TabsContent value="services" className="space-y-4 mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-semibold">Services</h3>
                <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setEditingService(null);
                        setServiceForm({ name: "", description: "", price: "", price_per_unit: "", discount_percentage: "", duration_minutes: "", duration_unit: "minutes", category_ids: [] });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Service
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-md max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingService ? 'Edit Service' : 'Add Service'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleServiceSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Service Name</Label>
                        <Input
                          id="name"
                          value={serviceForm.name}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={serviceForm.description}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          placeholder="Describe the service..."
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="price">Price ($)</Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            value={serviceForm.price}
                            onChange={(e) => setServiceForm(prev => ({ ...prev, price: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="discount">Discount %</Label>
                          <Input
                            id="discount"
                            type="number"
                            min="0"
                            max="100"
                            value={serviceForm.discount_percentage}
                            onChange={(e) => setServiceForm(prev => ({ ...prev, discount_percentage: e.target.value }))}
                          />
                          {((serviceForm.price && serviceForm.discount_percentage) || (serviceForm.price_per_unit && serviceForm.discount_percentage)) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {serviceForm.price && (
                                <>
                                  Final price: ${(parseFloat(serviceForm.price) * (1 - Math.max(0, parseFloat(serviceForm.discount_percentage) - 7) / 100)).toFixed(2)}
                                </>
                              )}
                              {serviceForm.price_per_unit && (
                                <>
                                  Final price/unit: ${(parseFloat(serviceForm.price_per_unit) * (1 - Math.max(0, parseFloat(serviceForm.discount_percentage) - 7) / 100)).toFixed(2)}
                                </>
                              )}
                              {parseFloat(serviceForm.discount_percentage) > 7 && (
                                <span className="block text-xs text-blue-600">
                                  Effective discount: {Math.max(0, parseFloat(serviceForm.discount_percentage) - 7)}% (after 7% platform fee)
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="price_per_unit">Price ($)/unit</Label>
                        <Input
                          id="price_per_unit"
                          type="number"
                          step="0.01"
                          value={serviceForm.price_per_unit}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, price_per_unit: e.target.value }))}
                          placeholder="For services sold per unit (e.g., Botox)"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="duration">Duration *</Label>
                          <div className="flex gap-2">
                            <Input
                              id="duration"
                              type="number"
                              min="0.5"
                              step="0.5"
                              value={serviceForm.duration_minutes}
                              onChange={(e) => setServiceForm(prev => ({ ...prev, duration_minutes: e.target.value }))}
                              placeholder="Enter duration"
                              className="flex-1 min-w-0"
                              required
                            />
                            <Select
                              value={serviceForm.duration_unit}
                              onValueChange={(value: "hours" | "minutes") => setServiceForm(prev => ({ ...prev, duration_unit: value }))}
                            >
                              <SelectTrigger className="w-[100px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="minutes">Minutes</SelectItem>
                                <SelectItem value="hours">Hours</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>Categories</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {categories.map((category) => (
                              <div key={category.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`admin-category-${category.id}`}
                                  checked={serviceForm.category_ids.includes(category.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setServiceForm(prev => ({
                                        ...prev,
                                        category_ids: [...prev.category_ids, category.id]
                                      }));
                                    } else {
                                      setServiceForm(prev => ({
                                        ...prev,
                                        category_ids: prev.category_ids.filter(id => id !== category.id)
                                      }));
                                    }
                                  }}
                                />
                                <Label
                                  htmlFor={`admin-category-${category.id}`}
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {category.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsServiceDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingService ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Services URL Scraping Section */}
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">Import Services from URL</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Enter the URL of the provider's services page to automatically extract pricing and timing information.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="https://example.com/services"
                      value={servicesUrl}
                      onChange={(e) => setServicesUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleScrapeServices}
                      disabled={isScrapingServices || !servicesUrl.trim()}
                    >
                      {isScrapingServices ? "Scraping..." : "Scrape Services"}
                    </Button>
                  </div>

                  {scrapedServices.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Found Services ({scrapedServices.length})</h4>
                      <div className="grid gap-3">
                        {scrapedServices.map((service, index) => (
                          <Card key={index} className="border-l-4 border-l-blue-500">
                            <CardContent className="pt-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h5 className="font-medium">{service.name}</h5>
                                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                    {service.price && (
                                      <div className="flex items-center gap-1">
                                        <DollarSign className="h-3 w-3" />
                                        <span>${service.price}</span>
                                      </div>
                                    )}
                                    {service.duration && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{service.duration} min</span>
                                      </div>
                                    )}
                                  </div>
                                  {service.description && service.description !== service.name && (
                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                      {service.description}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleImportScrapedService(service)}
                                  className="ml-2"
                                >
                                  Import
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4">{/* Single column for better mobile experience */}
                {services.map((service) => {
                  // Calculate discount for regular price
                  const regularDiscount = service.original_price && service.original_price > service.price
                    ? Math.round(((service.original_price - service.price) / service.original_price) * 100)
                    : 0;
                  
                  // Calculate discount for price per unit
                  const perUnitDiscount = service.original_price_per_unit && service.price_per_unit && service.original_price_per_unit > service.price_per_unit
                    ? Math.round(((service.original_price_per_unit - service.price_per_unit) / service.original_price_per_unit) * 100)
                    : 0;
                  
                  return (
                    <Card key={service.id}>
                      <CardContent className="pt-6 pb-12">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 pr-4">
                            <h4 className="font-semibold">{service.name}</h4>
                            {service.description && (
                              <p className="text-sm text-muted-foreground mt-1 mb-3">{service.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex flex-col">
                                {service.price && (
                                  <div className="flex items-center gap-2">
                                    <span>${service.price}</span>
                                    {regularDiscount > 0 && (
                                      <>
                                        <span className="text-sm text-muted-foreground line-through">
                                          ${service.original_price}
                                        </span>
                                        <Badge variant="secondary">{regularDiscount}% OFF</Badge>
                                      </>
                                    )}
                                  </div>
                                )}
                                {service.price_per_unit && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">${service.price_per_unit.toFixed(2)}/unit</span>
                                    {perUnitDiscount > 0 && (
                                      <>
                                        <span className="text-sm text-muted-foreground line-through">
                                          ${service.original_price_per_unit.toFixed(2)}/unit
                                        </span>
                                        <Badge variant="secondary">{perUnitDiscount}% OFF</Badge>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3 mb-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {service.duration_minutes > 30 
                                  ? `${(service.duration_minutes / 60).toFixed(service.duration_minutes % 60 === 0 ? 0 : 1)} hour${service.duration_minutes > 60 ? 's' : ''}`
                                  : `${service.duration_minutes} minutes`
                                }
                              </span>
                            </div>
                           </div>
                           <div className="flex gap-2 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => editService(service)}
                                className="flex items-center gap-1"
                              >
                                <Edit className="h-4 w-4" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteService(service.id, service.name)}
                                className="flex items-center gap-1"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Delete</span>
                              </Button>
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {services.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No services found</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="timeslots" className="space-y-4 mt-4">
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold">Time Slots</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <ManualAvailabilityInput 
                    providerId={selectedProvider.id}
                    onSuccess={() => {
                      fetchServiceTimeSlots();
                      toast({
                        title: "Time slots created successfully!",
                        description: "Services are now available for booking during the specified time.",
                      });
                    }}
                  />
                  <Dialog open={isTimeSlotDialogOpen} onOpenChange={setIsTimeSlotDialogOpen}>
                    <DialogTrigger asChild>
                      <Button disabled={services.length === 0} size="sm" className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Single Service Availability
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-md max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add Time Slot</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleTimeSlotSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="service">Service</Label>
                        <Select
                          value={timeSlotForm.service_id}
                          onValueChange={(value) => {
                            const selectedService = services.find(s => s.id === value);
                            setTimeSlotForm(prev => ({ 
                              ...prev, 
                              service_id: value,
                              duration_minutes: selectedService?.duration_minutes?.toString() || "60"
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select service" />
                          </SelectTrigger>
                          <SelectContent>
                            {services.map((service) => (
                              <SelectItem key={service.id} value={service.id}>
                                {service.name} ({service.duration_minutes > 30 
                                  ? `${(service.duration_minutes / 60).toFixed(service.duration_minutes % 60 === 0 ? 0 : 1)} hr${service.duration_minutes > 60 ? 's' : ''}`
                                  : `${service.duration_minutes} min`
                                })
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={timeSlotForm.date}
                          onChange={(e) => setTimeSlotForm(prev => ({ ...prev, date: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="start_time">Start Time</Label>
                        <Input
                          id="start_time"
                          type="time"
                          value={timeSlotForm.start_time}
                          onChange={(e) => setTimeSlotForm(prev => ({ ...prev, start_time: e.target.value }))}
                          required
                        />
                      </div>
                      {timeSlotForm.service_id && (
                        <div>
                          <Label>Duration</Label>
                          <div className="p-2 bg-muted rounded-md">
                            <span className="text-sm">
                              {(() => {
                                const selectedService = services.find(s => s.id === timeSlotForm.service_id);
                                return selectedService ? (
                                  selectedService.duration_minutes > 30 
                                    ? `${(selectedService.duration_minutes / 60).toFixed(selectedService.duration_minutes % 60 === 0 ? 0 : 1)} hour${selectedService.duration_minutes > 60 ? 's' : ''}`
                                    : `${selectedService.duration_minutes} minutes`
                                ) : 'Duration not set';
                              })()}
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">
                              Duration is automatically set from the selected service
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsTimeSlotDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Add Time Slot</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">{/* Simplified time slot grid */}
                {timeSlots.map((slot) => {
                  const service = services.find(s => s.id === slot.service_id);
                  return (
                     <Card key={slot.id}>
                       <CardContent className="pt-4">
                         <div className="flex justify-between items-center">
                           <div className="flex-1">
                             <h4 className="font-medium">{service?.name || 'Unknown Service'}</h4>
                             <p className="text-sm text-muted-foreground">
                               {new Date(slot.date).toLocaleDateString()} at {slot.start_time} - {slot.end_time}
                             </p>
                           </div>
                           <div className="flex items-center gap-2">
                             <Badge variant={slot.is_available ? "default" : "secondary"}>
                               {slot.is_available ? "Available" : "Booked"}
                             </Badge>
                             <Button
                               variant="destructive"
                               size="sm"
                               onClick={() => deleteTimeSlot(slot.id)}
                               className="flex items-center gap-1"
                             >
                               <Trash2 className="h-4 w-4" />
                               <span className="hidden sm:inline">Delete</span>
                             </Button>
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                  );
                })}
                {timeSlots.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No time slots found</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminProviders;