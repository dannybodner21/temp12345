import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Calendar, DollarSign, Settings, LogOut, Shield, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { BookingPlatformSelector, type BookingPlatform } from "@/components/BookingPlatformSelector";
import { SyncedAppointments } from "@/components/SyncedAppointments";
import { SyncedServiceToggle } from "@/components/SyncedServiceToggle";
import { StripeConnectCard } from "@/components/StripeConnectCard";
import { ProviderPreferences } from "@/components/ProviderPreferences";
import { BusinessSettingsModal } from "@/components/BusinessSettingsModal";
import PostAppointmentCharging from "@/components/PostAppointmentCharging";
import { PushNotificationSettings } from "@/components/PushNotificationSettings";
import { ManualAvailabilityInput } from "@/components/ManualAvailabilityInput";
import { getNowInPacific, getDateStringInPacific } from "@/lib/timezone";
import { useSyncedServices } from "@/hooks/useSyncedServices";

interface ProviderProfile {
  id: string;
  business_name: string;
  description?: string;
  is_verified: boolean;
  is_active: boolean;
}

interface PlatformConnection {
  id: string;
  platform: string;
  is_active: boolean;
}

interface DashboardMetrics {
  totalBookings: number;
  bookingsThisMonth: number;
  revenue: number;
  mostBookedService: string | null;
}

const ProviderDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [platformConnections, setPlatformConnections] = useState<PlatformConnection[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalBookings: 0,
    bookingsThisMonth: 0,
    revenue: 0,
    mostBookedService: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Use synced services hook
  const { services: syncedServices, refetch: refetchSyncedServices } = useSyncedServices(provider?.id || '');

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchProviderProfile(session.user.id);
          }, 0);
        } else {
          navigate("/provider-auth");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProviderProfile(session.user.id);
      } else {
        setIsLoading(false);
        navigate("/provider-auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const connected = urlParams.get('connected');
      const error = urlParams.get('error');
      const details = urlParams.get('details');
      
      if (connected === 'square') {
        console.log('Square connected successfully');
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Refresh the provider profile to show the new connection
        if (user) {
          await fetchProviderProfile(user.id);
        }
      } else if (error) {
        console.error('OAuth error:', error);
        console.log('OAuth error details raw:', details);
        console.log('Full URL params:', Object.fromEntries(urlParams.entries()));
        
        let errorMessage = 'An error occurred during Square connection.';
        
        if (details) {
          try {
            const parsedDetails = JSON.parse(decodeURIComponent(details));
            console.error('OAuth error details:', parsedDetails);
            
            // Provide specific error messages based on Square API errors
            if (error === 'oauth_failed') {
              if (parsedDetails.error === 'invalid_client') {
                errorMessage = 'Invalid Square application credentials. Please verify your Application ID and Secret in the Square Developer Console.';
              } else if (parsedDetails.error === 'invalid_grant') {
                errorMessage = 'Authorization code expired or invalid. Please try connecting again.';
              } else if (parsedDetails.error === 'invalid_request') {
                errorMessage = 'Invalid request to Square. Please check your redirect URI configuration in the Square Developer Console.';
              } else if (parsedDetails.error === 'unsupported_grant_type') {
                errorMessage = 'Unsupported grant type. Please contact support.';
              } else if (parsedDetails.error === 'unauthorized_client') {
                errorMessage = 'Unauthorized client. Please verify your Square application settings.';
              } else if (parsedDetails.error_description) {
                errorMessage = `Square OAuth error: ${parsedDetails.error_description}`;
              } else {
                errorMessage = `Square OAuth error: ${parsedDetails.error || 'Unknown error'}`;
              }
            } else if (error === 'network_error') {
              errorMessage = 'Network error connecting to Square. Please check your internet connection and try again.';
            } else if (error === 'storage_failed') {
              errorMessage = 'Connected to Square but failed to save connection. Please try again.';
            }
          } catch (e) {
            console.error('Failed to parse error details:', e);
            // Fallback to generic error messages
            const errorMessages = {
              'oauth_failed': 'Failed to connect to Square. Please try again.',
              'storage_failed': 'Connected to Square but failed to save connection. Please try again.',
              'missing_code': 'OAuth callback missing required data. Please try again.'
            };
            errorMessage = errorMessages[error as keyof typeof errorMessages] || errorMessage;
          }
        } else {
          // Fallback to generic error messages when no details are available
          const errorMessages = {
            'oauth_failed': 'Failed to connect to Square. Please try again.',
            'storage_failed': 'Connected to Square but failed to save connection. Please try again.',
            'missing_code': 'OAuth callback missing required data. Please try again.'
          };
          errorMessage = errorMessages[error as keyof typeof errorMessages] || errorMessage;
        }
        
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Show error message to user
        alert(errorMessage);
      }
    };

    if (user) {
      handleOAuthCallback();
    }
  }, [user]);

  const fetchDashboardMetrics = async (providerId: string) => {
    try {
      // Get current date and start of month in Pacific timezone
      const now = getNowInPacific();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // First get all services for this provider with names
      const { data: services } = await supabase
        .from("services")
        .select("id, name")
        .eq("provider_id", providerId);

      const serviceIds = services?.map(service => service.id) || [];

      if (serviceIds.length === 0) {
        setMetrics({
          totalBookings: 0,
          bookingsThisMonth: 0,
          revenue: 0,
          mostBookedService: null
        });
        return;
      }

      // Fetch total bookings (lifetime)
      const { count: totalBookings } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .in("service_id", serviceIds);

      // Fetch bookings this month
      const { count: bookingsThisMonth } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .gte("booking_date", getDateStringInPacific(startOfMonth))
        .in("service_id", serviceIds);

      // Fetch actual revenue and service booking counts
      const { data: revenueData } = await supabase
        .from("bookings")
        .select("total_price, final_cost, final_payment_status, service_id")
        .in("service_id", serviceIds);

      // Calculate total revenue from actual payments only
      let totalRevenue = 0;
      const serviceBookingCounts: Record<string, number> = {};
      
      revenueData?.forEach(booking => {
        // Count bookings per service
        const serviceId = booking.service_id;
        serviceBookingCounts[serviceId] = (serviceBookingCounts[serviceId] || 0) + 1;
        
        // Use final_cost if it exists and is paid (post-appointment adjustments)
        if (booking.final_cost && booking.final_payment_status === 'paid') {
          totalRevenue += Number(booking.final_cost || 0);
        } else {
          // Otherwise use the original total_price (which is the discounted price customer paid)
          totalRevenue += Number(booking.total_price || 0);
        }
      });

      // Find the most booked service
      let mostBookedService = null;
      let maxBookings = 0;
      
      Object.entries(serviceBookingCounts).forEach(([serviceId, count]) => {
        if (count > maxBookings) {
          maxBookings = count;
          const service = services?.find(s => s.id === serviceId);
          mostBookedService = service?.name || null;
        }
      });

      setMetrics({
        totalBookings: totalBookings || 0,
        bookingsThisMonth: bookingsThisMonth || 0,
        revenue: totalRevenue,
        mostBookedService: mostBookedService
      });
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      // Keep default values on error
    }
  };

  const fetchProviderProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("service_providers")
        .select("id, business_name, description, is_verified, is_active")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching provider profile:", error);
        navigate("/provider-auth");
        return;
      }

      if (!data) {
        console.error("No provider profile found");
        navigate("/provider-auth");
        return;
      }

      setProvider(data);
      
      // Fetch platform connections
      const { data: connections, error: connectionsError } = await supabase
        .from("provider_platform_connections")
        .select("id, platform, is_active")
        .eq("provider_id", data.id)
        .eq("is_active", true);
      
      if (!connectionsError) {
        setPlatformConnections(connections || []);
      }

      // Fetch dashboard metrics
      await fetchDashboardMetrics(data.id);
    } catch (err) {
      console.error("Unexpected error:", err);
      navigate("/provider-auth");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/provider-auth");
  };

  const handlePlatformConnect = async (platform: BookingPlatform) => {
    if (!provider) return;
    
    try {
      console.log(`Initiating ${platform} connection for provider:`, provider.id);
      
      const { data, error } = await supabase.functions.invoke('booking-platform-oauth', {
        body: { 
          provider_id: provider.id,
          platform,
          action: 'authorize'
        }
      });

      console.log('OAuth response:', { data, error });

      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }
      
      if (data?.authorization_url) {
        console.log('Redirecting to authorization URL:', data.authorization_url);
        window.location.href = data.authorization_url;
      } else {
        console.error('No authorization URL received');
        throw new Error('No authorization URL received from the server');
      }
    } catch (error) {
      console.error(`Error initiating ${platform} connection:`, error);
      // Show user-friendly error message with more details
      const errorMessage = error instanceof Error ? error.message : 
                          (typeof error === 'string' ? error : 
                           (error && typeof error === 'object' && 'message' in error ? error.message : 
                            JSON.stringify(error)));
      alert(`Failed to connect to ${platform}. Please try again. Error: ${errorMessage || 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !provider) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-background pt-16"> {/* Added pt-16 for top nav spacing */}
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {provider.business_name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {provider.is_verified ? "Verified Provider" : "Pending Verification"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Admin button for specific user */}
            {user.email === "jaclyntroth@gmail.com" && (
              <Link to="/admin-login">
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </Link>
            )}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Verification Banner */}
        {!provider.is_verified && (
          <div className="mb-6 p-4 bg-accent rounded-lg border border-accent-foreground/20">
            <h3 className="font-semibold text-accent-foreground mb-2">
              Account Verification Pending
            </h3>
            <p className="text-sm text-accent-foreground/80">
              Your account is under review. You'll be able to add services once verified.
            </p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                Lifetime bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Bookings This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.bookingsThisMonth}</div>
              <p className="text-xs text-muted-foreground">
                This month so far
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Most Booked Service</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {metrics.mostBookedService || "No bookings yet"}
              </div>
              <p className="text-xs text-muted-foreground">
                Your most popular service
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${metrics.revenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Actual revenue from completed bookings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Connect & Sync Platform</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your booking platform to sync appointments and manage services automatically.
              </p>
              <BookingPlatformSelector 
                onConnect={handlePlatformConnect}
                providerId={provider.id}
                connections={platformConnections}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manage Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add and manage your wellness services, set pricing, and configure availability.
              </p>
              <Button 
                disabled={!provider.is_verified} 
                className="w-full"
                onClick={() => provider.is_verified && navigate("/service-management")}
              >
                <Building2 className="mr-2 h-4 w-4" />
                {provider.is_verified ? "Manage Services" : "Verification Required"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Payment & Business Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StripeConnectCard providerId={provider.id} />

          <Card>
            <CardHeader>
              <CardTitle>Business Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Update your business information, contact details, and profile settings.
              </p>
              <BusinessSettingsModal providerId={provider.id} />
            </CardContent>
          </Card>
        </div>

        {/* Provider Preferences */}
        <div className="mb-8">
          <ProviderPreferences providerId={provider.id} />
        </div>

        {/* Push Notification Settings */}
        <div className="mb-8">
          <PushNotificationSettings />
        </div>

        {/* Post-Appointment Charging */}
        <div className="mb-8">
          <PostAppointmentCharging providerId={provider.id} />
        </div>

        {/* Synced Service Management */}
        <div className="mt-8 mb-8">
          <SyncedServiceToggle
            services={syncedServices}
            onUpdate={refetchSyncedServices}
          />
        </div>

        {/* Schedule Sync Section */}
        <div className="mt-8">
          <SyncedAppointments providerId={provider.id} />
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;