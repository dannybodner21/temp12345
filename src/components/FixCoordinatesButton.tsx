import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const FixCoordinatesButton: React.FC = () => {
  const [isFixing, setIsFixing] = useState(false);
  const { toast } = useToast();

  const handleFixCoordinates = async () => {
    setIsFixing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('geocode-provider-locations');
      
      if (error) {
        throw error;
      }

      const result = data;
      
      if (result.success) {
        toast({
          title: "Coordinates Updated! 🎯",
          description: `Successfully updated ${result.updated_count} providers with accurate coordinates.`,
        });
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error fixing coordinates:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update coordinates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Button
      onClick={handleFixCoordinates}
      disabled={isFixing}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isFixing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MapPin className="h-4 w-4" />
      )}
      {isFixing ? 'Fixing Coordinates...' : 'Fix Map Coordinates'}
    </Button>
  );
};

export default FixCoordinatesButton;