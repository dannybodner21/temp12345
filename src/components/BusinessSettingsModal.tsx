import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Save, Mail, Phone, Instagram, Building } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BusinessSettingsModalProps {
  providerId: string;
}

interface BusinessData {
  business_name: string;
  description: string;
  email: string;
  phone: string;
  instagram_handle: string;
  website_url: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
}

export const BusinessSettingsModal = ({ providerId }: BusinessSettingsModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [businessData, setBusinessData] = useState<BusinessData>({
    business_name: '',
    description: '',
    email: '',
    phone: '',
    instagram_handle: '',
    website_url: '',
    address: '',
    city: '',
    state: '',
    zip_code: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchBusinessData();
    }
  }, [isOpen, providerId]);

  const fetchBusinessData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('business_name, description, email, phone, instagram_handle, website_url, address, city, state, zip_code')
        .eq('id', providerId)
        .single();

      if (error) {
        console.error('Error fetching business data:', error);
        toast.error('Failed to load business information');
        return;
      }

      if (data) {
        setBusinessData({
          business_name: data.business_name || '',
          description: data.description || '',
          email: data.email || '',
          phone: data.phone || '',
          instagram_handle: data.instagram_handle || '',
          website_url: data.website_url || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip_code: data.zip_code || ''
        });
      }
    } catch (error) {
      console.error('Error fetching business data:', error);
      toast.error('Failed to load business information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('service_providers')
        .update({
          business_name: businessData.business_name,
          description: businessData.description,
          email: businessData.email,
          phone: businessData.phone,
          instagram_handle: businessData.instagram_handle,
          website_url: businessData.website_url,
          address: businessData.address,
          city: businessData.city,
          state: businessData.state,
          zip_code: businessData.zip_code
        })
        .eq('id', providerId);

      if (error) {
        console.error('Error saving business data:', error);
        toast.error('Failed to save business information');
        return;
      }

      toast.success('Business information saved successfully');
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving business data:', error);
      toast.error('Failed to save business information');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof BusinessData>(key: K, value: BusinessData[K]) => {
    setBusinessData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Settings className="mr-2 h-4 w-4" />
          Business Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Business Settings</DialogTitle>
          <DialogDescription>
            Update your business information and contact details
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Business Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <h4 className="font-medium">Business Information</h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="business_name">Business Name</Label>
                  <Input
                    id="business_name"
                    value={businessData.business_name}
                    onChange={(e) => updateField('business_name', e.target.value)}
                    placeholder="Enter your business name"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={businessData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Describe your business and services"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={businessData.website_url}
                    onChange={(e) => updateField('website_url', e.target.value)}
                    placeholder="https://your-website.com"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <h4 className="font-medium">Contact Information</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={businessData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="your@email.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used for booking notifications
                  </p>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={businessData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Shared with customers if enabled
                  </p>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="instagram_handle" className="flex items-center gap-2">
                    <Instagram className="h-4 w-4" />
                    Instagram Handle
                  </Label>
                  <Input
                    id="instagram_handle"
                    value={businessData.instagram_handle}
                    onChange={(e) => updateField('instagram_handle', e.target.value)}
                    placeholder="your_handle"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter without the @ symbol. Shared with customers if enabled.
                  </p>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h4 className="font-medium">Business Address</h4>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={businessData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={businessData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={businessData.state}
                      onChange={(e) => updateField('state', e.target.value)}
                      placeholder="State"
                    />
                  </div>

                  <div>
                    <Label htmlFor="zip_code">ZIP Code</Label>
                    <Input
                      id="zip_code"
                      value={businessData.zip_code}
                      onChange={(e) => updateField('zip_code', e.target.value)}
                      placeholder="12345"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Save className="h-4 w-4 mr-2 animate-pulse" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};