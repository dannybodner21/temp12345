import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Building2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

// Validation schemas
const loginSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters"),
  fullName: z.string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  businessName: z.string()
    .min(1, "Business name is required")
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name must be less than 100 characters"),
  address: z.string()
    .min(1, "Address is required")
    .min(5, "Please enter a complete address")
    .max(200, "Address must be less than 200 characters"),
  city: z.string()
    .min(1, "City is required")
    .min(2, "City must be at least 2 characters")
    .max(50, "City must be less than 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "City can only contain letters, spaces, hyphens, and apostrophes"),
  state: z.string()
    .min(1, "State is required")
    .min(2, "State must be at least 2 characters")
    .max(50, "State must be less than 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "State can only contain letters, spaces, hyphens, and apostrophes"),
  zipCode: z.string()
    .min(1, "ZIP code is required")
    .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid 5-digit ZIP code"),
  phone: z.string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === "") return true;
      // US phone number validation - allows various formats
      const phoneRegex = /^(\+1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
      return phoneRegex.test(val.replace(/\s/g, ''));
    }, "Please enter a valid US phone number (e.g., (123) 456-7890 or 1234567890)"),
  acceptsTextMessages: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const navigate = useNavigate();

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Signup form
  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
      businessName: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      acceptsTextMessages: false,
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    const { email, password } = data;

    try {
      console.log("Attempting login with email:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("Auth response:", { data, error });

      if (error) {
        console.error("Auth error:", error);
        setError(error.message);
        return;
      }

      if (data.user) {
        console.log("User authenticated successfully:", data.user.id);
        
        // Check if user is a provider
        console.log("Checking provider status for user:", data.user.id);
        const { data: provider, error: providerError } = await supabase
          .from("service_providers")
          .select("id, business_name, is_active, is_verified")
          .eq("user_id", data.user.id)
          .maybeSingle();

        console.log("Provider lookup result:", { provider, providerError });

        if (providerError) {
          console.error("Provider lookup error:", providerError);
          setError(`Error checking provider status: ${providerError.message}`);
          return;
        }

        if (provider) {
          console.log("Provider found, navigating to dashboard");
          navigate("/provider-dashboard");
        } else {
          console.log("No provider record found for user");
          setError("This account is not registered as a service provider.");
        }
      } else {
        console.log("No user data returned from authentication");
        setError("Authentication failed - no user data returned.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(`An unexpected error occurred: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const { email, password, fullName, businessName, address, city, state, zipCode, phone, acceptsTextMessages } = data;

    try {
      // Create auth user with provider data in metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/provider-dashboard`,
          data: {
            provider_signup: {
              full_name: fullName,
              business_name: businessName,
              address,
              city,
              state,
              zip_code: zipCode,
              phone: phone || "",
              accepts_text_messages: acceptsTextMessages || false
            }
          }
        }
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (authData.user) {
        setSuccess("Account created successfully! Your provider profile has been created and you can now sign in.");
        
        // Send admin notification for new provider signup
        try {
          await fetch(`https://hoealuscfuqrmpzyambj.supabase.co/functions/v1/notify-new-provider`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZWFsdXNjZnVxcm1wenlhbWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNzQzNTksImV4cCI6MjA2Nzg1MDM1OX0.d2gmMD5_hyyS28bRPXU3Tr6cXnkTDt7tcHkSH7Yo8UE`
            },
            body: JSON.stringify({
              user_id: authData.user.id,
              full_name: fullName,
              business_name: businessName,
              email: email,
              address: address,
              city: city,
              state: state
            })
          });
        } catch (error) {
          console.error('Failed to send admin notification:', error);
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 pb-16 pt-20">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Lately Providers</h1>
          <p className="text-muted-foreground">Manage your wellness services</p>
        </div>

        {error && (
          <Alert className="border-destructive bg-destructive/10">
            <AlertDescription className="text-destructive">{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Join as Provider</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>
                  Sign in to your provider account
                </CardDescription>
              </CardHeader>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)}>
                  <CardContent className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="your@email.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showLoginPassword ? "text" : "password"}
                                placeholder="Your password"
                                className="pr-10"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowLoginPassword(!showLoginPassword)}
                              >
                                {showLoginPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Join Lately</CardTitle>
                <CardDescription>
                  Start offering your services on our platform
                </CardDescription>
              </CardHeader>
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignup)}>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={signupForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="your@email.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={signupForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showSignupPassword ? "text" : "password"}
                                  placeholder="Create password"
                                  className="pr-10"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                                >
                                  {showSignupPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={signupForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your full name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signupForm.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your business name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signupForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Street address"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={signupForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="City"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={signupForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="State"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={signupForm.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="12345"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={signupForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Phone (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="(555) 123-4567"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* SMS Consent - Full Width */}
                    <FormField
                      control={signupForm.control}
                      name="acceptsTextMessages"
                      render={({ field: textField }) => (
                        <FormItem>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="acceptsTextMessages" 
                                checked={textField.value}
                                onCheckedChange={textField.onChange}
                              />
                              <Label htmlFor="acceptsTextMessages" className="text-sm font-normal">
                                I consent to receive SMS messages from Lately
                              </Label>
                            </div>
                            
                            <p className="text-xs text-muted-foreground/80 leading-relaxed">
                              By submitting this form, you consent to receive informational (e.g., appointment confirmations, updates) and/or marketing texts (e.g., cart reminders) from Lately, including texts sent by autodialer. Consent is not a condition of purchase. Msg & data rates may apply. Msg frequency varies. Unsubscribe at any time by replying STOP or clicking the unsubscribe link (where available). See our{" "}
                              <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>{" "}
                              and{" "}
                              <a href="/terms" className="text-primary hover:underline">Terms of Use</a>.
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Provider Account
                    </Button>
                    {success && (
                      <Alert className="border-primary bg-primary/10">
                        <AlertDescription className="text-primary">{success}</AlertDescription>
                      </Alert>
                    )}
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}