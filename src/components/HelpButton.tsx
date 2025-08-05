import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, Send, User, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const HelpButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useLocation();

  // Define pages where help button should be hidden (booking flow pages)
  const hiddenPages = ['/checkout', '/booking-success', '/services'];
  
  // Hide on booking flow pages and any page that isn't the main browse page
  const shouldHideButton = hiddenPages.some(page => location.pathname.startsWith(page)) || 
                          (location.pathname !== '/' && location.pathname !== '/bookings' && location.pathname !== '/profile');

  // Don't render the button if it should be hidden
  if (shouldHideButton) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast({
        title: "Please enter a message",
        description: "We need to know how we can help you!",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields for non-logged-in users
    if (!user && (!firstName.trim() || !email.trim())) {
      toast({
        title: "Please fill in all fields",
        description: "We need your name and email to help you!",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const requestBody = {
        message: message.trim(),
        isLoggedIn: !!user,
        ...(user ? {} : {
          firstName: firstName.trim(),
          email: email.trim()
        })
      };

      const { error } = await supabase.functions.invoke("send-help-request", {
        body: requestBody
      });

      if (error) throw error;

      toast({
        title: "Help request sent!",
        description: "We'll get back to you as soon as possible.",
      });

      setMessage("");
      setFirstName("");
      setEmail("");
      setIsOpen(false);
    } catch (error) {
      console.error("Error sending help request:", error);
      toast({
        title: "Failed to send request",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-24 right-6 z-50 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        >
          <HelpCircle className="h-5 w-5 mr-2" />
          Need Help?
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How can we help you?</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {user ? (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm">
              <p className="text-primary font-medium mb-1">Logged in as:</p>
              <p className="text-foreground">{user.email}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Your first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pl-10"
                    required={!user}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required={!user}
                  />
                </div>
              </div>
            </div>
          )}
          
          <div>
            <Label htmlFor="message">Your message</Label>
            <Textarea
              id="message"
              placeholder="Tell us what you need help with..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              "Sending..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Help Request
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};