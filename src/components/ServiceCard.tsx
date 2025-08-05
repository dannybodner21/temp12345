import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTimeInPacific, formatDateInPacific, getTodayInPacific } from "@/lib/timezone";
import { formatDuration } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useGoogleReviews } from "@/hooks/useGoogleReviews";
import { GoogleReviewsModal } from "@/components/GoogleReviewsModal";
import { 
  Instagram, 
  Hand, 
  Sparkles, 
  Scissors, 
  Dumbbell, 
  Heart, 
  Stethoscope, 
  Car, 
  Home, 
  Shirt, 
  Wrench, 
  Camera, 
  GraduationCap, 
  Baby, 
  Users, 
  Flower, 
  Zap, 
  Brush, 
  Gift,
  Dog,
  Star
} from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number | null;
  original_price: number | null;
  price_per_unit: number | null;
  original_price_per_unit: number | null;
  duration_minutes: number;
  image_url: string | null;
  category?: {
    name: string;
  };
  provider?: {
    business_name: string;
    google_maps_url?: string;
    instagram_handle?: string | null;
    instagram_url?: string | null;
    share_instagram?: boolean | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip_code?: string | null;
  };
  availableTimes?: Array<{
    id: string;
    start_time: string;
    end_time: string;
    date: string;
  }>;
}

// Helper function to render category icon
const renderCategoryIcon = (iconName: string | null, categoryName: string, className: string) => {
  if (iconName) {
    switch (iconName.toLowerCase()) {
      case 'hand': return <Hand className={className} />;
      case 'sparkles': return <Sparkles className={className} />;
      case 'scissors': return <Scissors className={className} />;
      case 'dumbbell': return <Dumbbell className={className} />;
      case 'heart': return <Heart className={className} />;
      case 'stethoscope': return <Stethoscope className={className} />;
      case 'car': return <Car className={className} />;
      case 'home': return <Home className={className} />;
      case 'shirt': return <Shirt className={className} />;
      case 'wrench': return <Wrench className={className} />;
      case 'camera': return <Camera className={className} />;
      case 'graduationcap': return <GraduationCap className={className} />;
      case 'baby': return <Baby className={className} />;
      case 'users': return <Users className={className} />;
      case 'flower': return <Flower className={className} />;
      case 'zap': return <Zap className={className} />;
      case 'brush': return <Brush className={className} />;
      case 'gift': return <Gift className={className} />;
      case 'dog': return <Dog className={className} />;
      default: return <Sparkles className={className} />;
    }
  }

  // Default icons based on category name keywords
  const lowerCategoryName = categoryName.toLowerCase();
  if (lowerCategoryName.includes('massage') || lowerCategoryName.includes('therapy') || lowerCategoryName.includes('touch')) {
    return <Hand className={className} />;
  } else if (lowerCategoryName.includes('beauty') || lowerCategoryName.includes('facial') || lowerCategoryName.includes('skin')) {
    return <Sparkles className={className} />;
  } else if (lowerCategoryName.includes('hair') || lowerCategoryName.includes('salon') || lowerCategoryName.includes('barber')) {
    return <Scissors className={className} />;
  } else if (lowerCategoryName.includes('fitness') || lowerCategoryName.includes('gym') || lowerCategoryName.includes('workout')) {
    return <Dumbbell className={className} />;
  } else if (lowerCategoryName.includes('wellness') || lowerCategoryName.includes('health') || lowerCategoryName.includes('medical')) {
    return <Heart className={className} />;
  } else if (lowerCategoryName.includes('automotive') || lowerCategoryName.includes('car') || lowerCategoryName.includes('vehicle')) {
    return <Car className={className} />;
  } else if (lowerCategoryName.includes('home') || lowerCategoryName.includes('house') || lowerCategoryName.includes('repair')) {
    return <Home className={className} />;
  } else if (lowerCategoryName.includes('pet') || lowerCategoryName.includes('dog') || lowerCategoryName.includes('animal')) {
    return <Dog className={className} />;
  } else {
    return <Sparkles className={className} />;
  }
};

interface ServiceCardProps {
  service: Service;
  onBook: (serviceId: string, timeSlotId: string) => void;
  onBusinessNameClick?: () => void;
}

export function ServiceCard({ service, onBook, onBusinessNameClick }: ServiceCardProps) {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [shouldShowReadMore, setShouldShowReadMore] = useState(false);
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  // Fetch Google Reviews for this provider
  const { reviews, rating, totalRatings, loading: reviewsLoading, error: reviewsError } = useGoogleReviews(
    service.provider?.google_maps_url
  );

  useEffect(() => {
    if (descriptionRef.current) {
      const lineHeight = parseFloat(getComputedStyle(descriptionRef.current).lineHeight);
      const height = descriptionRef.current.scrollHeight;
      const lines = Math.ceil(height / lineHeight);
      setShouldShowReadMore(lines > 7);
    }
  }, [service.description]);
  
  // Determine if this service uses fixed price or price per unit
  const usesFixedPrice = service.price !== null && service.price > 0;
  const currentPrice = usesFixedPrice ? service.price : service.price_per_unit;
  const originalPrice = usesFixedPrice ? service.original_price : service.original_price_per_unit;
  
  const hasDiscount = originalPrice && currentPrice && originalPrice > currentPrice;
  const discountPercentage = hasDiscount 
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  // Helper function to get Instagram URL
  const getInstagramUrl = () => {
    if (service.provider?.instagram_url) {
      return service.provider.instagram_url;
    } else if (service.provider?.instagram_handle) {
      const cleanHandle = service.provider.instagram_handle.replace('@', '');
      return `https://www.instagram.com/${cleanHandle}/`;
    }
    return null;
  };

  const handleInstagramClick = () => {
    const instagramUrl = getInstagramUrl();
    if (instagramUrl) {
      window.open(instagramUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
      {service.image_url && (
        <div className="aspect-video w-full overflow-hidden rounded-t-lg">
          <img 
            src={service.image_url} 
            alt={service.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {service.name}
              {/* Google Reviews Rating */}
              {rating && (
                <button
                  onClick={() => setIsReviewsModalOpen(true)}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                  title="View reviews"
                >
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {rating.toFixed(1)}
                  </span>
                </button>
              )}
            </CardTitle>
            {service.provider && (
              <div className="mt-1">
                {isMobile ? (
                  // Mobile: Instagram icon next to business name
                  <div className="flex items-center gap-2">
                    <p 
                      className={`text-sm ${onBusinessNameClick ? 'text-primary hover:underline cursor-pointer' : 'text-muted-foreground'}`}
                      onClick={onBusinessNameClick}
                    >
                      {service.provider.business_name}
                    </p>
                      {(service.provider.instagram_handle || service.provider.instagram_url) && (
                       <Button 
                         variant="outline" 
                         size="sm" 
                         className="p-2.5 border-0 bg-gradient-to-tr from-[#FFDC80] via-[#FF6B9D] to-[#8A2BE2] text-white hover:opacity-80 transition-opacity w-9 h-9" 
                         onClick={handleInstagramClick}
                         title="View Instagram Profile"
                       >
                          <Instagram className="h-6 w-6" />
                       </Button>
                     )}
                  </div>
                ) : (
                  // Desktop/Tablet: Instagram icon next to business name
                  <div className="flex items-center gap-2">
                    <p 
                      className={`text-sm ${onBusinessNameClick ? 'text-primary hover:underline cursor-pointer' : 'text-muted-foreground'}`}
                      onClick={onBusinessNameClick}
                    >
                      {service.provider.business_name}
                    </p>
                     {(service.provider.instagram_handle || service.provider.instagram_url) && (
                       <Button 
                         variant="outline" 
                         size="sm" 
                         className="p-2.5 border-0 bg-gradient-to-tr from-[#FFDC80] via-[#FF6B9D] to-[#8A2BE2] text-white hover:opacity-80 transition-opacity w-9 h-9" 
                         onClick={handleInstagramClick}
                         title="View Instagram Profile"
                       >
                         <Instagram className="h-6 w-6" />
                       </Button>
                     )}
                  </div>
                )}
              </div>
            )}
          </div>
          {hasDiscount && (
            <Badge variant="destructive" className="text-xs px-2.5 py-1 rounded-full min-w-[50px] text-center leading-tight">
              {discountPercentage}% OFF
            </Badge>
          )}
        </div>
        {service.category && (
          <Badge variant="secondary" className="w-fit flex items-center gap-1.5">
            {renderCategoryIcon(null, service.category.name, "h-3.5 w-3.5")}
            {service.category.name}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        <div className="mb-4">
          <p 
            ref={descriptionRef}
            className={`text-muted-foreground text-sm transition-all duration-300 ${
              !isDescriptionExpanded && shouldShowReadMore 
                ? 'line-clamp-7' 
                : ''
            }`}
            style={{ 
              display: '-webkit-box',
              WebkitLineClamp: !isDescriptionExpanded && shouldShowReadMore ? 7 : 'none',
              WebkitBoxOrient: 'vertical',
              overflow: !isDescriptionExpanded && shouldShowReadMore ? 'hidden' : 'visible'
            }}
          >
            {service.description}
          </p>
          {shouldShowReadMore && (
            <button
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="text-primary text-sm font-medium hover:underline mt-1"
            >
              {isDescriptionExpanded ? 'Read less' : 'Read more'}
            </button>
          )}
        </div>
        
        <div className="mb-4">
          {service.availableTimes && service.availableTimes.length > 0 && (
            <>
              <span className="text-sm font-medium text-foreground mb-2 block">Available Times:</span>
              <div className="flex flex-wrap gap-2">
                {service.availableTimes.map((timeSlot) => {
                  const startTime = formatTimeInPacific(timeSlot.start_time);
                  const isToday = timeSlot.date === getTodayInPacific();
                  const dateLabel = isToday ? "Today" : formatDateInPacific(timeSlot.date);
                  const isSelected = selectedTimeSlot === timeSlot.id;
                  return (
                    <Button
                      key={timeSlot.id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-8 flex-col py-1"
                      onClick={() => setSelectedTimeSlot(timeSlot.id)}
                    >
                      <span>{startTime}</span>
                      {!isToday && <span className="text-[10px] opacity-70">{dateLabel.split(',')[0]}</span>}
                    </Button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground">Duration:</span>
          <span className="text-sm font-medium">{formatDuration(service.duration_minutes)}</span>
        </div>

        <div className="flex items-center gap-2">
          {currentPrice !== null && currentPrice !== undefined ? (
            hasDiscount ? (
              <>
                <span className="text-lg font-bold text-destructive">
                  ${currentPrice.toFixed(2)}{!usesFixedPrice ? '/unit' : ''}
                </span>
                <span className="text-sm text-muted-foreground line-through decoration-destructive">
                  ${originalPrice?.toFixed(2)}{!usesFixedPrice ? '/unit' : ''}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-primary">
                ${currentPrice.toFixed(2)}{!usesFixedPrice ? '/unit' : ''}
              </span>
            )
          ) : (
            <span className="text-sm text-muted-foreground">
              Contact for pricing
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Button 
          onClick={() => {
            if (selectedTimeSlot) {
              const selectedSlot = service.availableTimes?.find(slot => slot.id === selectedTimeSlot);
              if (selectedSlot) {
                const timeString = formatTimeInPacific(selectedSlot.start_time);
                navigate('/checkout', {
                  state: {
                    serviceId: service.id,
                    timeSlotId: selectedTimeSlot,
                    serviceName: service.name,
                    providerName: service.provider?.business_name || 'Unknown Provider',
                    providerPhone: service.provider?.phone,
                    providerEmail: service.provider?.email,
                    providerAddress: service.provider?.address,
                    providerCity: service.provider?.city,
                    providerState: service.provider?.state,
                    providerZipCode: service.provider?.zip_code,
                    originalPrice: originalPrice || currentPrice,
                    discountedPrice: currentPrice,
                    timeSlot: timeString,
                    date: formatDateInPacific(selectedSlot.date),
                    duration: service.duration_minutes,
                    usesFixedPrice
                  }
                });
              }
            } else if (service.availableTimes?.length) {
              // Show toast when user clicks without selecting a time slot
              toast({
                title: "Please select a time slot",
                description: "You need to choose an available time before booking.",
                variant: "destructive",
              });
            }
          }}
          disabled={!service.availableTimes?.length}
          className={`w-full ${selectedTimeSlot ? 'bg-red-600 hover:bg-red-700' : ''}`}
        >
          Book Now
        </Button>
      </CardFooter>

      {/* Google Reviews Modal */}
      <GoogleReviewsModal
        isOpen={isReviewsModalOpen}
        onClose={() => setIsReviewsModalOpen(false)}
        businessName={service.provider?.business_name || 'Business'}
        reviews={reviews}
        rating={rating}
        totalRatings={totalRatings}
        loading={reviewsLoading}
        error={reviewsError}
      />
    </Card>
  );
}