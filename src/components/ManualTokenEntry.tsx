import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreditCard, AlertCircle, CheckCircle, ExternalLink, Key, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { BookingPlatform } from "./BookingPlatformSelector";

interface ManualTokenEntryProps {
  platform: BookingPlatform;
  providerId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ManualTokenEntry = ({ 
  platform, 
  providerId, 
  onSuccess, 
  onCancel 
}: ManualTokenEntryProps) => {
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessToken.trim()) {
      toast({
        title: "Missing Information",
        description: "Access token is required",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // For Square, we need specific data structure
      if (platform === "square") {
        // Insert into provider_platform_connections
        const { error: connectionError } = await supabase
          .from("provider_platform_connections")
          .insert({
            provider_id: providerId,
            platform: platform,
            access_token: accessToken,
            refresh_token: refreshToken || null,
            platform_specific_data: {
              merchant_id: merchantId,
              application_id: applicationId,
              environment: "sandbox", // Default to sandbox for manual entry
              manual_entry: true
            },
            is_active: true
          });

        if (connectionError) throw connectionError;

        // Also insert into Square-specific table for compatibility
        const { error: squareError } = await supabase
          .from("provider_square_connections")
          .insert({
            provider_id: providerId,
            access_token: accessToken,
            refresh_token: refreshToken || null,
            square_merchant_id: merchantId,
            square_application_id: applicationId,
            is_active: true
          });

        if (squareError) throw squareError;
      } else {
        // For other platforms, use generic structure
        const { error } = await supabase
          .from("provider_platform_connections")
          .insert({
            provider_id: providerId,
            platform: platform,
            access_token: accessToken,
            refresh_token: refreshToken || null,
            platform_specific_data: {
              manual_entry: true
            },
            is_active: true
          });

        if (error) throw error;
      }

      toast({
        title: "Connection Successful",
        description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} has been connected successfully`,
      });

      onSuccess();
    } catch (error) {
      console.error("Error saving manual connection:", error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to save connection",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlatformInstructions = () => {
    switch (platform) {
      case "square":
        return {
          title: "Square API Credentials",
          description: "Connect using your Square API credentials from the Square Developer Console",
          instructions: [
            "1. Go to Square Developer Console (developer.squareup.com)",
            "2. Select your application or create a new one",
            "3. Navigate to 'Credentials' section",
            "4. Copy your Sandbox or Production Access Token",
            "5. Find your Application ID and Merchant ID in the same section"
          ],
          fields: [
            { id: "access_token", label: "Access Token", required: true, placeholder: "sq0atp-...", description: "Your Square Access Token" },
            { id: "merchant_id", label: "Merchant ID", required: true, placeholder: "ML4Y5E4JQOF05", description: "Your Square Merchant ID" },
            { id: "application_id", label: "Application ID", required: true, placeholder: "sq0idp-...", description: "Your Square Application ID" },
            { id: "refresh_token", label: "Refresh Token (Optional)", required: false, placeholder: "sq0rtp-...", description: "Optional: Refresh token for long-term access" }
          ]
        };
      case "vagaro":
        return {
          title: "Vagaro API Credentials",
          description: "Connect using your Vagaro API access token",
          instructions: [
            "1. Log into your Vagaro business account",
            "2. Go to Settings > API Integration",
            "3. Generate or copy your API access token",
            "4. Paste the token below"
          ],
          fields: [
            { id: "access_token", label: "API Access Token", required: true, placeholder: "vag_...", description: "Your Vagaro API access token" }
          ]
        };
      case "boulevard":
        return {
          title: "Boulevard API Credentials",
          description: "Connect using your Boulevard API credentials",
          instructions: [
            "1. Access your Boulevard business dashboard",
            "2. Navigate to Integrations > API",
            "3. Generate your API access token",
            "4. Copy the token below"
          ],
          fields: [
            { id: "access_token", label: "API Access Token", required: true, placeholder: "blvd_...", description: "Your Boulevard API access token" }
          ]
        };
      case "zenoti":
        return {
          title: "Zenoti API Credentials",
          description: "Connect using your Zenoti API access token",
          instructions: [
            "1. Log into your Zenoti admin panel",
            "2. Go to Settings > API Management",
            "3. Create or copy your API access token",
            "4. Enter the token below"
          ],
          fields: [
            { id: "access_token", label: "API Access Token", required: true, placeholder: "zen_...", description: "Your Zenoti API access token" }
          ]
        };
      case "setmore":
        return {
          title: "Setmore API Credentials",
          description: "Connect using your Setmore refresh token",
          instructions: [
            "1. Contact Setmore support to get your refresh token",
            "2. Once you receive your refresh token, paste it below",
            "3. This will allow automatic syncing of appointments and availability",
            "4. Your token will be automatically refreshed every 7 days"
          ],
          fields: [
            { id: "refresh_token", label: "Refresh Token", required: true, placeholder: "setmore_refresh_...", description: "Your Setmore refresh token" }
          ]
        };
      default:
        return {
          title: "API Credentials",
          description: "Enter your platform API credentials",
          instructions: ["Please contact support for specific instructions"],
          fields: [
            { id: "access_token", label: "Access Token", required: true, placeholder: "", description: "Your API access token" }
          ]
        };
    }
  };

  const platformConfig = getPlatformInstructions();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>{platformConfig.title}</CardTitle>
            <CardDescription>{platformConfig.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <ScrollArea className="h-[60vh]">
        <CardContent className="space-y-6 pb-12">
          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              <strong>Alternative Connection Method:</strong> If OAuth isn't working, you can connect manually using your API credentials.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Setup Instructions:</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              {platformConfig.instructions.map((instruction, index) => (
                <div key={index}>{instruction}</div>
              ))}
            </div>
            {platform === "square" && (
              <Button variant="outline" size="sm" asChild>
                <a href="https://developer.squareup.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Square Developer Console
                </a>
              </Button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {platformConfig.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>
                  {field.label} 
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={field.id}
                  type="password"
                  placeholder={field.placeholder}
                  value={
                    field.id === "access_token" ? accessToken :
                    field.id === "refresh_token" ? refreshToken :
                    field.id === "merchant_id" ? merchantId :
                    field.id === "application_id" ? applicationId : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (field.id === "access_token") setAccessToken(value);
                    else if (field.id === "refresh_token") setRefreshToken(value);
                    else if (field.id === "merchant_id") setMerchantId(value);
                    else if (field.id === "application_id") setApplicationId(value);
                  }}
                  required={field.required}
                />
                {field.description && (
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                )}
              </div>
            ))}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your credentials are stored securely and encrypted. They will only be used to sync your appointments and services.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Connecting..." : "Connect"}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};