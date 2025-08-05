import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, DollarSign, Users, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export function Hero() {
  const isMobile = useIsMobile();
  
  return (
    <section className={`relative flex items-center ${isMobile ? 'min-h-[75vh]' : 'min-h-[75vh] pt-16'}`}>

      {/* Clean Gradient Background with Green Undertones */}
      <div className="absolute inset-0 z-0" style={{ background: 'var(--gradient-hero)' }} />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-20">
        {/* Provider Button - Top Right on Mobile/Tablet Only */}
        <div className="flex justify-end mb-6 lg:hidden">
          <Link to="/provider-auth">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Lately Business Partners
            </Button>
          </Link>
        </div>
        
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-6xl font-playfair italic font-bold text-foreground leading-tight mb-4">
            Lately
          </h1>
          
          <h2 className="text-lg text-muted-foreground mb-6">
            What have you done for yourself, <span className="font-bold">lately</span>?
          </h2>
          
          <p className="text-2xl text-foreground mb-8 leading-relaxed font-playfair font-semibold">
            Book same-day beauty and wellness nearby—always at a discount.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link to="/services">
              <Button size="lg" className="text-lg px-8 py-6 bg-primary hover:bg-primary/90">
                Book Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            
            <Link to="/faqs">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 bg-card border-border hover:bg-card/90 hover:shadow-md transition-all">
                Learn how Lately works
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex gap-4 sm:gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span>Verified Providers</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span>Discounted Services</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span>Same-Day Bookings</span>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator - positioned at very bottom of viewport */}
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 animate-bounce z-20">
          <ChevronDown className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
    </section>
  );
}