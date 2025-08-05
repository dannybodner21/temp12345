import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GoogleMapsModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
  googleMapsUrl: string;
}

export const GoogleMapsModal = ({ isOpen, onClose, businessName, googleMapsUrl }: GoogleMapsModalProps) => {
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const openInNewTab = () => {
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    const fetchEmbedUrl = async () => {
      if (!isOpen || !googleMapsUrl) return;
      
      setIsLoading(true);
      setError('');
      
      try {
        const { data, error } = await supabase.functions.invoke('google-maps-embed', {
          body: { googleMapsUrl, businessName }
        });

        if (error) throw error;
        setEmbedUrl(data.embedUrl);
      } catch (error) {
        console.error('Error fetching embed URL:', error);
        setError('Failed to load map. You can still open it in a new tab.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmbedUrl();
  }, [isOpen, googleMapsUrl, businessName]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {businessName} Location
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="w-full h-96 border rounded-lg overflow-hidden bg-muted">
            {isLoading ? (
              <div className="w-full h-full animate-pulse flex items-center justify-center">
                <p className="text-muted-foreground">Loading map...</p>
              </div>
            ) : error ? (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-muted-foreground text-center">{error}</p>
              </div>
            ) : (
              <iframe
                src={embedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`${businessName} location map`}
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={openInNewTab} variant="outline" className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Google Maps
            </Button>
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};