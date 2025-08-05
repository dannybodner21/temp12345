import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Instagram, ExternalLink } from "lucide-react";

interface InstagramPreviewProps {
  instagramHandle?: string;
  instagramUrl?: string;
  businessName: string;
  trigger?: React.ReactNode;
}

export const InstagramPreview = ({ instagramHandle, instagramUrl, businessName, trigger }: InstagramPreviewProps) => {
  // Determine the Instagram URL and handle to use
  let finalInstagramUrl = "";
  let displayHandle = "";
  
  if (instagramUrl) {
    // Use the full URL if provided
    finalInstagramUrl = instagramUrl;
    // Extract handle from URL for display
    const urlMatch = instagramUrl.match(/instagram\.com\/([^/?]+)/);
    displayHandle = urlMatch ? urlMatch[1] : instagramHandle || "instagram";
  } else if (instagramHandle) {
    // Clean the Instagram handle (remove @ if present) and construct URL
    const cleanHandle = instagramHandle.replace('@', '');
    finalInstagramUrl = `https://www.instagram.com/${cleanHandle}/`;
    displayHandle = cleanHandle;
  } else {
    // No Instagram info available
    return null;
  }

  const handleOpenInstagram = () => {
    window.open(finalInstagramUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="p-2">
            <Instagram className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5" />
            {businessName} on Instagram
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-6 pb-6">
          <div className="bg-background rounded-lg overflow-hidden border">
            {/* Instagram preview content */}
            <div className="p-6 text-center">
              <Instagram className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">{businessName}</h3>
              <p className="text-muted-foreground mb-4">@{displayHandle}</p>
              <p className="text-sm text-muted-foreground mb-4">
                View their Instagram profile to see their latest work and portfolio.
              </p>
              <Button 
                onClick={handleOpenInstagram}
                className="gap-2"
              >
                <Instagram className="h-4 w-4" />
                View Instagram Profile
              </Button>
            </div>
          </div>
          
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              This is a preview of {businessName}'s Instagram profile. You can view their latest posts and portfolio to see their work before booking.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};