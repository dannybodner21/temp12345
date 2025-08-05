import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Phone, 
  Instagram,
  Settings,
  Save,
  Percent,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProviderPreferencesProps {
  providerId: string;
}

interface PreferencesData {
  share_phone: boolean;
  default_discount_percentage: number;
  requires_service_approval: boolean;
}

export const ProviderPreferences = ({ providerId }: ProviderPreferencesProps) => {
  const [preferences, setPreferences] = useState<PreferencesData>({
    share_phone: true,
    default_discount_percentage: 10,
    requires_service_approval: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, [providerId]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('share_phone, default_discount_percentage, requires_service_approval')
        .eq('id', providerId)
        .single();

      if (error) {
        console.error('Error fetching preferences:', error);
        toast.error('Failed to load preferences');
        return;
      }

      if (data) {
        setPreferences({
          share_phone: data.share_phone ?? true,
          default_discount_percentage: data.default_discount_percentage ?? 10,
          requires_service_approval: data.requires_service_approval ?? true
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('service_providers')
        .update({
          share_phone: preferences.share_phone,
          default_discount_percentage: preferences.default_discount_percentage,
          requires_service_approval: preferences.requires_service_approval
        })
        .eq('id', providerId);

      if (error) {
        console.error('Error saving preferences:', error);
        toast.error('Failed to save preferences');
        return;
      }

      toast.success('Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreference = <K extends keyof PreferencesData>(
    key: K, 
    value: PreferencesData[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Provider Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Provider Preferences
        </CardTitle>
        <CardDescription>
          Manage what contact information to share with customers and configure service settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contact Information Sharing */}
        <div className="space-y-4">
          <h4 className="font-medium">Contact Information Sharing</h4>
          <p className="text-sm text-muted-foreground">
            Choose what contact information to share with customers after they book an appointment
          </p>
           
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="share-phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Share phone number
                </Label>
                <p className="text-sm text-muted-foreground">
                  Customers will see your phone number in booking confirmations
                </p>
              </div>
              <Switch
                id="share-phone"
                checked={preferences.share_phone}
                onCheckedChange={(checked) => updatePreference('share_phone', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Service Management */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <h4 className="font-medium">Service Management</h4>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="service-approval" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Require service approval
                </Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, you'll be notified to approve new services before they go live. 
                  When disabled, services sync automatically.
                </p>
              </div>
              <Switch
                id="service-approval"
                checked={preferences.requires_service_approval}
                onCheckedChange={(checked) => updatePreference('requires_service_approval', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-discount" className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Default discount percentage
              </Label>
              <p className="text-sm text-muted-foreground">
                This discount will be applied to all your services. Set to 0 for no discount.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  id="default-discount"
                  type="number"
                  min="0"
                  max="100"
                  value={preferences.default_discount_percentage}
                  onChange={(e) => updatePreference('default_discount_percentage', Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Save Button */}
        <Button 
          onClick={savePreferences} 
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
              Save Preferences
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};