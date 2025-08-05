import { User, Mail, Phone, MapPin, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import EditProfileModal from "@/components/EditProfileModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [totalSavings, setTotalSavings] = useState<number>(0);
  const [savingsLoading, setSavingsLoading] = useState(false);
  const { toast } = useToast();

  const showComingSoon = (feature: string) => {
    toast({
      title: "Coming Soon!",
      description: `${feature} feature is currently under development. Stay tuned!`,
    });
  };

  // Fetch total savings from discounts
  const fetchTotalSavings = async () => {
    if (!user) return;
    
    setSavingsLoading(true);
    try {
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(`
          id,
          total_price,
          services (
            price,
            original_price
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "confirmed");

      if (error) {
        console.error("Error fetching bookings:", error);
        return;
      }

      let totalSavings = 0;
      if (bookings) {
        bookings.forEach((booking: any) => {
          if (booking.services?.original_price && booking.services?.price) {
            const discount = Number(booking.services.original_price) - Number(booking.services.price);
            if (discount > 0) {
              totalSavings += discount;
            }
          }
        });
      }

      setTotalSavings(totalSavings);
    } catch (error) {
      console.error("Error calculating savings:", error);
    } finally {
      setSavingsLoading(false);
    }
  };

  // Fetch profile data
  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
      } else {
        setProfileData(data);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchTotalSavings();
  }, [user]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto px-6 py-8 text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Create Your Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Sign up or log in to access your profile and manage your bookings.
              </p>
              <Button 
                onClick={() => navigate("/auth")}
                className="w-full"
              >
                Get Started
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-6 py-8 pt-12">
        {/* Profile Header */}
        <Card className="mb-6 border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src="" alt="Profile" />
                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                  {(() => {
                    const firstName = profileData?.first_name || user.user_metadata?.first_name || user.email?.split('@')[0] || '';
                    const lastName = profileData?.last_name || user.user_metadata?.last_name || '';
                    const firstInitial = firstName.charAt(0).toUpperCase();
                    const lastInitial = lastName.charAt(0).toUpperCase();
                    return `${firstInitial}${lastInitial}`;
                  })()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {profileData?.first_name || user.user_metadata?.first_name || user.email?.split('@')[0] || 'User'}
              </h2>
              <p className="text-muted-foreground mb-4">
                Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowEditModal(true)}
              >
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Total Savings */}
        <Card className="mb-6 border-border bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="h-2 w-2 bg-primary rounded-full"></div>
                <h3 className="font-semibold text-foreground">Your Total Savings</h3>
                <div className="h-2 w-2 bg-primary rounded-full"></div>
              </div>
              {savingsLoading ? (
                <div className="text-muted-foreground">Calculating savings...</div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-primary mb-1">
                    ${totalSavings.toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Money saved by booking with Lately
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="mb-6 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{user.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {profileData?.phone || "Add phone number"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {profileData?.address ? 
                  `${profileData.address}${profileData.city ? `, ${profileData.city}` : ''}${profileData.state ? `, ${profileData.state}` : ''}${profileData.zip_code ? ` ${profileData.zip_code}` : ''}` 
                  : "Add your address"
                }
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="mb-6 border-border cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/payment-methods")}>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <CreditCard className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold text-sm">Payment Methods</h3>
              <p className="text-xs text-muted-foreground">Manage your payment options</p>
            </div>
          </CardContent>
        </Card>


        {/* Sign Out */}
        <div className="mt-8 mb-8 text-center">
          <Button 
            variant="outline" 
            className="text-destructive hover:text-destructive"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>

        {/* Legal Links */}
        <div className="text-center text-sm text-muted-foreground mb-24 space-y-2">
          <div className="flex justify-center gap-4">
            <a 
              href="/terms" 
              className="hover:text-foreground transition-colors underline"
            >
              Terms of Service
            </a>
            <span>•</span>
            <a 
              href="/privacy" 
              className="hover:text-foreground transition-colors underline"
            >
              Privacy Policy
            </a>
          </div>
        </div>

        {/* Edit Profile Modal */}
        {user && (
          <EditProfileModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            user={user}
            onProfileUpdate={fetchProfile}
          />
        )}
      </div>
    </div>
  );
};

export default Profile;