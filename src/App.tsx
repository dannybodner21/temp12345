import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { HelpButton } from "@/components/HelpButton";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Bookings from "./pages/Bookings";
import Profile from "./pages/Profile";
import Services from "./pages/Services";
import Checkout from "./pages/Checkout";
import BookingSuccess from "./pages/BookingSuccess";
import ServiceManagement from "./pages/ServiceManagement";
import AdminLogin from "./pages/AdminLogin";
import ProviderAuth from "./pages/ProviderAuth";
import ProviderDashboard from "./pages/ProviderDashboard";
import AdminProviders from "./pages/AdminProviders";
import AdminBookings from "./pages/AdminBookings";
import AdminSyncSettings from "./pages/AdminSyncSettings";
import OAuthCallback from "./pages/OAuthCallback";
import SquareOAuthCallback from "./pages/SquareOAuthCallback";
import PaymentMethods from "./pages/PaymentMethods";
import Auth from "./pages/Auth";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Categories from "./pages/Categories";
import FAQs from "./pages/FAQs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/services" element={<Services />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/services/:category" element={<Services />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/booking-success" element={<BookingSuccess />} />
              <Route path="/service-management" element={<ServiceManagement />} />
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route path="/provider-auth" element={<ProviderAuth />} />
              <Route path="/provider-dashboard" element={<ProviderDashboard />} />
              <Route path="/payment-methods" element={<PaymentMethods />} />
              <Route path="/oauth/callback" element={<OAuthCallback />} />
              <Route path="/square-oauth-callback" element={<SquareOAuthCallback />} />
              <Route path="/admin/providers" element={<AdminProviders />} />
              <Route path="/admin/bookings" element={<AdminBookings />} />
              <Route path="/admin/sync-settings" element={<AdminSyncSettings />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/faqs" element={<FAQs />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <BottomNav />
            <HelpButton />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
