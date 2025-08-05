import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Edit, Trash2, DollarSign, Clock, Tag, Building2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { ManualAvailabilityInput } from "@/components/ManualAvailabilityInput";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  duration_minutes: number;
  category_id: string | null;
  image_url: string | null;
  is_available: boolean;
  categories?: {
    id: string;
    name: string;
  }[];
}

interface Category {
  id: string;
  name: string;
}

interface ProviderProfile {
  id: string;
  business_name: string;
  is_verified: boolean;
}

export default function ServiceManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    original_price: "",
    discount_percentage: "",
    duration_minutes: "",
    duration_unit: "minutes" as "hours" | "minutes",
    category_ids: [] as string[],
    image_url: "",
    is_available: true
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/provider-auth");
        return;
      }
      setUser(session.user);
      await fetchProviderProfile(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const fetchProviderProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("service_providers")
        .select("id, business_name, is_verified")
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        navigate("/provider-auth");
        return;
      }

      setProvider(data);
      await Promise.all([
        fetchServices(data.id),
        fetchCategories()
      ]);
    } catch (err) {
      console.error("Error fetching provider:", err);
      navigate("/provider-auth");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServices = async (providerId: string) => {
    // First get all services for this provider
    const { data: servicesData, error: servicesError } = await supabase
      .from("services")
      .select("*")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    if (servicesError || !servicesData) {
      console.error("Error fetching services:", servicesError);
      return;
    }

    // Then get category mappings for these services
    const serviceIds = servicesData.map(service => service.id);
    
    if (serviceIds.length > 0) {
      // Get mappings and categories separately to avoid join issues
      const { data: mappingsData } = await supabase
        .from("service_category_mappings")
        .select("service_id, category_id")
        .in("service_id", serviceIds);

      const { data: categoriesData } = await supabase
        .from("service_categories")
        .select("id, name");

      // Transform the data to include categories array
      const servicesWithCategories = servicesData.map(service => {
        const serviceMappings = mappingsData?.filter(mapping => mapping.service_id === service.id) || [];
        const serviceCategories = serviceMappings
          .map(mapping => categoriesData?.find(cat => cat.id === mapping.category_id))
          .filter(Boolean) as { id: string; name: string }[];
        
        return {
          ...service,
          categories: serviceCategories
        };
      });
      
      setServices(servicesWithCategories);
    } else {
      setServices(servicesData.map(service => ({ ...service, categories: [] })));
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("service_categories")
      .select("id, name")
      .order("name");

    if (!error && data) {
      setCategories(data);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      original_price: "",
      discount_percentage: "",
      duration_minutes: "",
      duration_unit: "minutes" as "hours" | "minutes",
      category_ids: [],
      image_url: "",
      is_available: true
    });
    setEditingService(null);
  };

  const handleEdit = async (service: Service) => {
    setEditingService(service);
    
    // Fetch current categories for this service
    const { data: serviceCategoryMappings } = await supabase
      .from("service_category_mappings")
      .select("category_id")
      .eq("service_id", service.id);
    
    const currentCategoryIds = serviceCategoryMappings?.map(mapping => mapping.category_id) || [];
    
    // Calculate discount percentage from original and current price
    // Reverse the platform fee calculation: add back the 7% platform fee
    const effectiveDiscountPercentage = service.original_price && service.original_price > service.price
      ? Math.round(((service.original_price - service.price) / service.original_price) * 100)
      : 0;
    const originalInputDiscount = effectiveDiscountPercentage + 7; // Add back platform fee
    
    // Convert duration from minutes to hours if it makes sense
    const canDisplayAsHours = service.duration_minutes >= 30 && service.duration_minutes % 30 === 0;
    const displayDuration = canDisplayAsHours ? service.duration_minutes / 60 : service.duration_minutes;
    const displayUnit = canDisplayAsHours ? "hours" : "minutes";
    
    setFormData({
      name: service.name,
      description: service.description || "",
      original_price: service.original_price?.toString() || service.price.toString(),
      discount_percentage: originalInputDiscount > 7 ? originalInputDiscount.toString() : "",
      duration_minutes: displayDuration.toString(),
      duration_unit: displayUnit,
      category_ids: currentCategoryIds,
      image_url: service.image_url || "",
      is_available: service.is_available
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;

    // Validate that at least one category is selected
    if (formData.category_ids.length === 0) {
      toast({
        title: "Category required",
        description: "Please select at least one category for this service.",
        variant: "destructive"
      });
      return;
    }

    // Calculate current price from original price and discount percentage
    // Adjust for platform fee: if provider sets 20% discount, effective discount is 13% (20% - 7%)
    const originalPrice = parseFloat(formData.original_price);
    const inputDiscountPercentage = parseFloat(formData.discount_percentage) || 0;
    const platformFeePercentage = 7; // Lately keeps 7%
    const effectiveDiscountPercentage = Math.max(0, inputDiscountPercentage - platformFeePercentage);
    const currentPrice = originalPrice * (1 - effectiveDiscountPercentage / 100);

    // Convert duration to minutes if specified in hours
    const durationInMinutes = formData.duration_unit === "hours" 
      ? parseFloat(formData.duration_minutes) * 60 
      : parseInt(formData.duration_minutes);

    const serviceData = {
      name: formData.name,
      description: formData.description || null,
      price: currentPrice,
      original_price: inputDiscountPercentage > 0 ? originalPrice : null,
      duration_minutes: durationInMinutes,
      image_url: formData.image_url || null,
      is_available: formData.is_available,
      provider_id: provider.id
    };

    try {
      let serviceId: string;

      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editingService.id);

        if (error) throw error;
        serviceId = editingService.id;

        // Delete existing category mappings
        await supabase
          .from("service_category_mappings")
          .delete()
          .eq("service_id", serviceId);

        toast({ title: "Service updated successfully!" });
      } else {
        const { data, error } = await supabase
          .from("services")
          .insert([serviceData])
          .select("id")
          .single();

        if (error) throw error;
        serviceId = data.id;
        toast({ title: "Service created successfully!" });
      }

      // Insert new category mappings
      if (formData.category_ids.length > 0) {
        const categoryMappings = formData.category_ids.map(categoryId => ({
          service_id: serviceId,
          category_id: categoryId
        }));

        const { error: mappingError } = await supabase
          .from("service_category_mappings")
          .insert(categoryMappings);

        if (mappingError) throw mappingError;
      }

      await fetchServices(provider.id);
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving service:", error);
      toast({
        title: "Error saving service",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", serviceId);

      if (error) throw error;

      toast({ title: "Service deleted successfully!" });
      if (provider) {
        await fetchServices(provider.id);
      }
    } catch (error) {
      console.error("Error deleting service:", error);
      toast({
        title: "Error deleting service",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSmartCategorization = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Service name required",
        description: "Please enter a service name first.",
        variant: "destructive"
      });
      return;
    }

    const serviceName = formData.name.toLowerCase();
    
    // Simple keyword matching to existing categories
    const categoryMatches = [
      { keywords: ['massage', 'deep tissue', 'swedish', 'hot stone', 'prenatal', 'sports massage'], category: 'Massage' },
      { keywords: ['yoga', 'pilates', 'fitness', 'workout', 'exercise', 'training'], category: 'Fitness' },
      { keywords: ['facial', 'skincare', 'beauty', 'makeup', 'eyebrow', 'brow', 'lashes', 'lash', 'lamination', 'tint', 'lift'], category: 'Beauty' },
      { keywords: ['nail', 'manicure', 'pedicure'], category: 'Nail Care' },
      { keywords: ['hair', 'haircut', 'styling', 'color', 'highlights'], category: 'Hair Care' },
      { keywords: ['therapy', 'counseling', 'mental health', 'wellness'], category: 'Therapy' },
    ];

    for (const match of categoryMatches) {
      if (match.keywords.some(keyword => serviceName.includes(keyword))) {
        // Find the category in our existing categories
        const existingCategory = categories.find(cat => cat.name === match.category);
        if (existingCategory) {
          setFormData(prev => ({
            ...prev,
            category_ids: [...prev.category_ids, existingCategory.id].filter((id, index, arr) => arr.indexOf(id) === index)
          }));
          toast({
            title: "Category suggested",
            description: `"${formData.name}" categorized as "${match.category}"`,
          });
          return;
        }
      }
    }

    toast({
      title: "No category match",
      description: "Couldn't find a matching category. Please select manually.",
    });
  };

  const calculateDiscount = (original: number | null, current: number) => {
    if (!original || original <= current) return 0;
    return Math.round(((original - current) / original) * 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading services...</p>
        </div>
      </div>
    );
  }

  if (!provider?.is_verified) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-6 py-4">
            <Button variant="ghost" onClick={() => navigate("/provider-dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </header>
        <div className="container mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Account Verification Required</h1>
          <p className="text-muted-foreground">
            Your account needs to be verified before you can manage services.
          </p>
        </div>
      </div>
    );
  }

  

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" onClick={() => navigate("/provider-dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Service Management</h1>
          </div>

          {/* Add Service Button */}
          <div className="flex flex-wrap items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    resetForm();
                  }}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingService ? "Edit Service" : "Add New Service"}
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Service Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="original_price">Price ($) *</Label>
                      <Input
                        id="original_price"
                        type="number"
                        step="0.01"
                        value={formData.original_price}
                        onChange={(e) => setFormData(prev => ({ ...prev, original_price: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="discount_percentage">Discount % (Optional)</Label>
                      <Input
                        id="discount_percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={formData.discount_percentage}
                        onChange={(e) => setFormData(prev => ({ ...prev, discount_percentage: e.target.value }))}
                        placeholder="0"
                      />
                      {formData.original_price && formData.discount_percentage && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Final price: ${(parseFloat(formData.original_price) * (1 - Math.max(0, parseFloat(formData.discount_percentage) - 7) / 100)).toFixed(2)}
                          {parseFloat(formData.discount_percentage) > 7 && (
                            <span className="block text-xs text-blue-600">
                              Effective discount: {Math.max(0, parseFloat(formData.discount_percentage) - 7)}% (after 7% platform fee)
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="duration">Duration *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="duration"
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={formData.duration_minutes}
                          onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                          placeholder="Enter duration"
                          className="flex-1 min-w-0"
                          required
                        />
                        <Select
                          value={formData.duration_unit}
                          onValueChange={(value: "hours" | "minutes") => setFormData(prev => ({ ...prev, duration_unit: value }))}
                        >
                          <SelectTrigger className="w-[120px]">
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
                        <div className="flex items-center justify-between">
                          <Label>Categories *</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSmartCategorization}
                            disabled={!formData.name.trim()}
                            className="h-7 px-2 text-xs"
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            Smart Match
                          </Button>
                        </div>
                        {formData.category_ids.length === 0 && (
                          <p className="text-xs text-destructive mt-1">
                            Please select at least one category
                          </p>
                        )}
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {categories.map((category) => (
                          <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`category-${category.id}`}
                              checked={formData.category_ids.includes(category.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    category_ids: [...prev.category_ids, category.id]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    category_ids: prev.category_ids.filter(id => id !== category.id)
                                  }));
                                }
                              }}
                            />
                            <Label
                              htmlFor={`category-${category.id}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {category.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="image_url">Image URL</Label>
                    <Input
                      id="image_url"
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingService ? "Update Service" : "Create Service"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            
            <ManualAvailabilityInput 
              providerId={provider?.id || ""}
              onSuccess={() => {
                toast({
                  title: "Time slots created successfully!",
                  description: "Your services are now available for booking during the specified time.",
                });
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {services.length === 0 ? (
              <div className="text-center py-16">
                <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">No services yet</h2>
                <p className="text-muted-foreground mb-6">
                  Create your first service to start accepting bookings.
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Service
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => {
                  const discount = calculateDiscount(service.original_price, service.price);
                  return (
                    <Card key={service.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{service.name}</CardTitle>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(service)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(service.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {service.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {service.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">${service.price}</span>
                            {service.original_price && service.original_price > service.price && (
                              <>
                                <span className="text-sm text-muted-foreground line-through">
                                  ${service.original_price}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {discount}% OFF
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{service.duration_minutes} minutes</span>
                        </div>

                        {service.categories && service.categories.length > 0 && (
                          <div className="flex items-start gap-2">
                            <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div className="flex flex-wrap gap-1">
                              {service.categories.map((category) => (
                                <Badge key={category.id} variant="outline" className="text-xs">
                                  {category.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <Badge variant={service.is_available ? "default" : "secondary"}>
                            {service.is_available ? "Available" : "Unavailable"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
      </div>
    </div>
  );
}