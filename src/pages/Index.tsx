import { Hero } from "@/components/Hero";
import { ServiceCategories } from "@/components/ServiceCategories";
import { ServiceGrid } from "@/components/ServiceGrid";
import InteractiveMap from "@/components/InteractiveMap";

const Index = () => {
  const handleServiceClick = (serviceId: string) => {
    // Scroll to the service in the grid below
    const serviceElement = document.getElementById(`service-${serviceId}`);
    if (serviceElement) {
      serviceElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero and Service Categories - Responsive Layout */}
      <div className="flex flex-col lg:flex-row">
        {/* Hero Section - Left on desktop, top on mobile/tablet */}
        <div className="w-full lg:w-1/2">
          <Hero />
        </div>
        
        {/* Service Categories - Right on desktop, bottom on mobile/tablet */}
        <div className="w-full lg:w-1/2">
          <ServiceCategories />
        </div>
      </div>
      
      {/* Interactive Map Section */}
      <section className="py-8 lg:pt-4 lg:pb-12 bg-background">
        <div className="w-full px-4 sm:px-6 lg:container lg:mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
              Available Locations Today
            </h2>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
              Click on a pin to see service details and availability
            </p>
          </div>
          <div className="w-full">
            <InteractiveMap onServiceClick={handleServiceClick} />
          </div>
        </div>
      </section>
      
      {/* Today's Services Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Today's Available Services
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Book these services with available appointments today
            </p>
          </div>
          <ServiceGrid />
        </div>
      </section>
    </div>
  );
};

export default Index;
