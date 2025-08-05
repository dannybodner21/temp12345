import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Heart, 
  Sparkles, 
  Scissors, 
  Dog,
  ArrowRight,
  Dumbbell,
  Palette,
  Hand,
  Tag,
  Flower,
  Brain,
  ArrowLeft,
  Smile
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { getTodayInPacific, getNowInPacific, formatInPacific } from "@/lib/timezone";

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  todayTimeSlotCount?: number;
}

// Icon rendering function
const renderCategoryIcon = (iconName: string | null, categoryName: string, className: string) => {
  const lowerName = categoryName.toLowerCase();
  
  // Check icon_name first, then fallback to category name matching
  if (iconName) {
    switch (iconName) {
      case 'heart': return <Heart className={className} />;
      case 'sparkles': return <Sparkles className={className} />;
      case 'scissors': return <Scissors className={className} />;
      case 'dog': return <Dog className={className} />;
      case 'dumbbell': return <Dumbbell className={className} />;
      case 'palette': return <Palette className={className} />;
      case 'hand': return <Hand className={className} />;
      case 'flower': return <Flower className={className} />;
      case 'brain': return <Brain className={className} />;
    }
  }
  
  // Fallback based on category name
  if (lowerName.includes('massage')) return <Hand className={className} />;
  if (lowerName.includes('beauty') || lowerName.includes('skincare')) return <Sparkles className={className} />;
  if (lowerName.includes('hair')) return <Scissors className={className} />;
  if (lowerName.includes('fitness') || lowerName.includes('yoga')) return <Dumbbell className={className} />;
  if (lowerName.includes('nail') || lowerName.includes('manicure') || lowerName.includes('pedicure')) return <Palette className={className} />;
  if (lowerName.includes('facial')) return <Smile className={className} />;
  if (lowerName.includes('therapy') || lowerName.includes('wellness')) return <Brain className={className} />;
  if (lowerName.includes('pet')) return <Dog className={className} />;
  
  return <Tag className={className} />;
};

const getColorForCategory = (categoryName: string) => {
  const lowerName = categoryName.toLowerCase();
  if (lowerName.includes('massage')) return "text-pink-600";
  if (lowerName.includes('beauty') || lowerName.includes('skincare')) return "text-purple-600";
  if (lowerName.includes('hair')) return "text-blue-600";
  if (lowerName.includes('fitness') || lowerName.includes('yoga')) return "text-green-600";
  if (lowerName.includes('nail')) return "text-orange-600";
  if (lowerName.includes('therapy') || lowerName.includes('wellness')) return "text-teal-600";
  if (lowerName.includes('pet')) return "text-amber-600";
  return "text-gray-600";
};

const Categories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      // Use Pacific Time utility for consistent timezone handling
      const today = getTodayInPacific();
      const currentPacificTime = getNowInPacific();
      const currentTimeString = formatInPacific(currentPacificTime, 'HH:mm:ss');
      
      // Get categories with their services and time slots
      const { data: categoriesData, error } = await supabase
        .from('service_categories')
        .select(`
          id,
          name,
          description,
          icon_name,
          services(
            id,
            is_available,
            time_slots(
              id,
              date,
              start_time,
              is_available
            )
          )
        `);

      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }

      // Transform data to include counts of unique time slots available today
      const categoriesWithCounts = categoriesData?.map(category => ({
        ...category,
        todayTimeSlotCount: category.services?.reduce((totalSlots, service) => {
          if (!service.is_available) return totalSlots;
          const todaySlots = service.time_slots?.filter(slot => {
            if (!slot.is_available || slot.date !== today) return false;
            // Filter out past time slots for today (same logic as Services page)
            return slot.start_time > currentTimeString;
          }) || [];
          return totalSlots + todaySlots.length;
        }, 0) || 0
      })) || [];

      // Show all categories, sorted by today's available time slots
      const sortedCategories = categoriesWithCounts
        .sort((a, b) => (b.todayTimeSlotCount || 0) - (a.todayTimeSlotCount || 0));

      setCategories(sortedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/services/${encodeURIComponent(categoryName)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <section className="py-20 bg-gradient-to-b from-background to-muted/30">
          <div className="container mx-auto px-6">
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded w-64 mx-auto mb-4"></div>
                <div className="h-4 bg-muted rounded w-96 mx-auto"></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-6">
          {/* Back to Home Button - Desktop Only */}
          <div className="hidden lg:block mb-8">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </button>
          </div>

          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Explore Wellness Categories
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose your vibe — all bookable today
            </p>
          </div>

          {categories.length === 0 ? (
            <div className="text-center">
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Categories will appear here as services are added
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => {
                const color = getColorForCategory(category.name);
                const hasAvailableSlots = (category.todayTimeSlotCount || 0) > 0;
                return (
                  <Card 
                    key={category.id} 
                    className={`group transition-all duration-300 cursor-pointer ${
                      hasAvailableSlots 
                        ? "hover:shadow-lg hover:-translate-y-1 bg-card border-border" 
                        : "bg-muted/50 border-muted opacity-60 cursor-not-allowed"
                    }`}
                    onClick={() => hasAvailableSlots && handleCategoryClick(category.name)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg transition-colors ${
                          hasAvailableSlots 
                            ? "bg-muted/50 group-hover:bg-primary/10" 
                            : "bg-muted/30"
                        }`}>
                          {renderCategoryIcon(category.icon_name, category.name, `h-6 w-6 ${hasAvailableSlots ? `${color} group-hover:text-primary` : 'text-muted-foreground'} transition-colors`)}
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold text-lg mb-2 ${hasAvailableSlots ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {category.name}
                          </h3>
                          <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
                            {category.name.toLowerCase().includes('beauty') 
                              ? "Botox and other med spa treatments"
                              : category.name.toLowerCase().includes('wellness')
                              ? "Chiropractic care, IV therapy, cold plunges and more"
                              : (category.description || `Professional ${category.name.toLowerCase()} services`)
                            }
                          </p>
                          <div className="flex items-center justify-between">
                            {hasAvailableSlots ? (
                              <>
                                {(category.todayTimeSlotCount || 0) <= 4 && (category.todayTimeSlotCount || 0) > 0 && (
                                  <span className="text-xs text-destructive font-medium">
                                    {(category.todayTimeSlotCount || 0) === 1 
                                      ? "Only 1 spot left!" 
                                      : "Only a few spots left today!"
                                    }
                                  </span>
                                )}
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all ml-auto" />
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground font-medium">
                                No availability today
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Categories;