import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface GoogleReview {
  author_name: string;
  author_url?: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

interface GoogleReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
  reviews: GoogleReview[];
  rating: number | null;
  totalRatings: number | null;
  loading: boolean;
  error: string | null;
}

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      className={`h-4 w-4 ${
        i < Math.floor(rating)
          ? 'fill-yellow-400 text-yellow-400'
          : i < rating
          ? 'fill-yellow-400/50 text-yellow-400'
          : 'text-gray-300'
      }`}
    />
  ));
};

export function GoogleReviewsModal({
  isOpen,
  onClose,
  businessName,
  reviews,
  rating,
  totalRatings,
  loading,
  error
}: GoogleReviewsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            Reviews for {businessName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Unable to load reviews: {error}
              </p>
            </div>
          ) : (
            <>
              {/* Overall Rating Summary */}
              {rating && (
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-foreground">
                      {rating.toFixed(1)}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {renderStars(rating)}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {totalRatings ? `Based on ${totalRatings} reviews` : 'Google Reviews'}
                  </div>
                </div>
              )}

              {/* Individual Reviews */}
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Customer Reviews</h3>
                  {reviews.map((review, index) => (
                    <div key={index} className="border-b border-border pb-4 last:border-b-0">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={review.profile_photo_url} alt={review.author_name} />
                          <AvatarFallback>
                            {review.author_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{review.author_name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {review.relative_time_description}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            {renderStars(review.rating)}
                            <span className="text-sm text-muted-foreground ml-1">
                              {review.rating}/5
                            </span>
                          </div>
                        </div>
                      </div>
                      {review.text && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {review.text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No reviews available for this business.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}