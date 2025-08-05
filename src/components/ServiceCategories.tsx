import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Smile
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { getTodayInPacific } from "@/lib/timezone";

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

export function ServiceCategories() {
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
          const todaySlots = service.time_slots?.filter(slot => 
            slot.is_available && slot.date === today
          ) || [];
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

  const handleViewAllCategories = () => {
    navigate("/categories");
  };

  // Featured categories to show in 3x2 grid
  const featuredCategoryNames = ['massage', 'facial', 'hair', 'pet grooming', 'manicure & pedicure', 'wellness'];
  
  const featuredCategories = categories.filter(cat => 
    featuredCategoryNames.some(featured => 
      cat.name.toLowerCase().includes(featured.toLowerCase())
    )
  ).slice(0, 6);

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-6">
          {/* Provider Button - Top Right on Desktop Only */}
          <div className="hidden lg:flex justify-end mb-6">
            <Link to="/provider-auth">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Lately Business Partners
              </Button>
            </Link>
          </div>
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-64 mx-auto mb-4"></div>
              <div className="h-4 bg-muted rounded w-96 mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return (
      <section className="py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-6">
          {/* Provider Button - Top Right on Desktop Only */}
          <div className="hidden lg:flex justify-end mb-6">
            <Link to="/provider-auth">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Lately Business Partners
              </Button>
            </Link>
          </div>
          <div className="text-center">
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Categories will appear here as services are added
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 lg:py-4 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-6">
        {/* Provider Button - Top Right on Desktop Only */}
        <div className="hidden lg:flex justify-end mb-6 pt-16">
          <Link to="/provider-auth">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Lately Business Partners
            </Button>
          </Link>
        </div>

        {/* Title and Subheader - Hidden on desktop */}
        <div className="text-center mb-8 lg:hidden">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Available locations today
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose your vibe — all bookable today
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-8 lg:grid-rows-3">
          {featuredCategories.map((category) => {
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
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${
                      hasAvailableSlots 
                        ? "bg-muted/50 group-hover:bg-primary/10" 
                        : "bg-muted/30"
                    }`}>
                      {renderCategoryIcon(category.icon_name, category.name, `h-5 w-5 ${hasAvailableSlots ? `${color} group-hover:text-primary` : 'text-muted-foreground'} transition-colors`)}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold text-base mb-1 ${hasAvailableSlots ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {category.name}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-2 leading-relaxed">
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

        <div className="text-center">
          <Button 
            variant="outline" 
            size="lg" 
            className="px-8 py-6"
            onClick={handleViewAllCategories}
          >
            View All Categories
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}