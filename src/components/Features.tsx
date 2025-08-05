import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  DollarSign, 
  Calendar, 
  Clock, 
  MapPin 
} from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Verified Providers",
    description: "All service providers are thoroughly vetted and certified professionals",
    badge: "Trust & Safety"
  },
  {
    icon: DollarSign,
    title: "Discounted Services",
    description: "Save up to 30% on premium services with our Lately pricing",
    badge: "Save Money"
  },
  {
    icon: Calendar,
    title: "Same-Day Bookings",
    description: "Book appointments instantly with real-time availability",
    badge: "Convenience"
  },
  {
    icon: Clock,
    title: "Flexible Scheduling",
    description: "Find appointments that fit your schedule, even last minute",
    badge: "Flexibility"
  },
  {
    icon: MapPin,
    title: "Local",
    description: "Services available near you",
    badge: "Accessibility"
  }
];

export function Features() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Why Choose Our Platform?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We've designed the perfect wellness marketplace with your needs in mind.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="text-center border-border bg-card hover:shadow-md transition-shadow">
                <CardContent className="p-8">
                  <div className="mb-4">
                    <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <Badge variant="secondary" className="mb-4">
                      {feature.badge}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
