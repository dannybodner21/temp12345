import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AICategorizationResult {
  categoryId: string;
  categoryName: string;
  isNewCategory: boolean;
  confidence: number;
  reasoning: string;
  description?: string;
}

export const useAIServiceCategorization = () => {
  const [isLoading, setIsLoading] = useState(false);

  const categorizeService = async (serviceName: string, serviceDescription?: string): Promise<AICategorizationResult | null> => {
    if (!serviceName.trim()) {
      toast.error('Service name is required for categorization');
      return null;
    }

    console.log('Starting AI categorization for:', serviceName, serviceDescription);
    setIsLoading(true);
    
    try {
      console.log('Calling supabase function with:', {
        serviceName: serviceName.trim(),
        serviceDescription: serviceDescription?.trim()
      });

      const { data, error } = await supabase.functions.invoke('categorize-service-ai', {
        body: {
          serviceName: serviceName.trim(),
          serviceDescription: serviceDescription?.trim()
        }
      });

      console.log('Supabase function response:', { data, error });

      if (error) {
        console.error('AI categorization error:', error);
        toast.error(`AI categorization failed: ${error.message || 'Unknown error'}`);
        return null;
      }

      if (data?.error) {
        console.error('AI categorization API error:', data.error);
        toast.error(`AI categorization failed: ${data.error}`);
        return null;
      }

      if (data.error) {
        console.error('AI categorization API error:', data.error);
        toast.error('AI categorization failed: ' + data.error);
        return null;
      }

      const result = data as AICategorizationResult;
      
      if (result.isNewCategory) {
        toast.success(`Created new category: "${result.categoryName}"`);
      } else {
        toast.success(`Categorized as: "${result.categoryName}" (${Math.round(result.confidence * 100)}% confidence)`);
      }

      return result;
    } catch (error) {
      console.error('Error categorizing service:', error);
      toast.error('Failed to categorize service');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    categorizeService,
    isLoading
  };
};