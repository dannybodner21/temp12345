import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Privacy Policy</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h3 className="text-lg font-semibold mb-3">1. Information We Collect</h3>
              <div className="text-muted-foreground leading-relaxed space-y-2">
                <p>We collect information you provide directly to us, such as:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Name, email address, and phone number</li>
                  <li>Profile information and preferences</li>
                  <li>Payment information (processed securely through third parties)</li>
                  <li>Booking history and service preferences</li>
                  <li>Communications with us and service providers</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">2. How We Use Your Information</h3>
              <div className="text-muted-foreground leading-relaxed space-y-2">
                <p>We use the information we collect to:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Facilitate bookings between you and service providers</li>
                  <li>Process payments and send booking confirmations</li>
                  <li>Communicate with you about your bookings and account</li>
                  <li>Improve our platform and services</li>
                  <li>Provide customer support</li>
                  <li>Send you updates and promotional materials (with your consent)</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">3. Information Sharing</h3>
              <p className="text-muted-foreground leading-relaxed">
                We share your information with service providers only to the extent necessary to facilitate your bookings. 
                This includes your name, contact information, and appointment details. We do not sell your personal 
                information to third parties.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">4. Service Providers</h3>
              <p className="text-muted-foreground leading-relaxed">
                Service providers on our platform are independent contractors. They may have access to your booking 
                information and contact details necessary to provide their services. Each provider is responsible for 
                their own privacy practices regarding the information you share with them.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">5. Data Security</h3>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate technical and organizational measures to protect your personal information 
                against unauthorized access, alteration, disclosure, or destruction. Payment information is processed 
                through secure, PCI-compliant payment processors.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">6. Data Retention</h3>
              <p className="text-muted-foreground leading-relaxed">
                We retain your information for as long as your account is active or as needed to provide you services. 
                We may also retain and use your information as necessary to comply with legal obligations, resolve 
                disputes, and enforce our agreements.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">7. Your Rights</h3>
              <div className="text-muted-foreground leading-relaxed space-y-2">
                <p>You have the right to:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Access and update your personal information</li>
                  <li>Request deletion of your account and data</li>
                  <li>Opt out of promotional communications</li>
                  <li>Request a copy of the information we have about you</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">8. Cookies and Tracking</h3>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies and similar technologies to improve your experience, analyze usage patterns, 
                and provide personalized content. You can control cookie settings through your browser preferences.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">9. Third-Party Services</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our platform integrates with third-party services for payments, analytics, and other functionalities. 
                These services have their own privacy policies, and we encourage you to review them.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">10. Children's Privacy</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our services are not intended for children under 13 years of age. We do not knowingly collect 
                personal information from children under 13.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">11. Changes to This Policy</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
                the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">12. Contact Us</h3>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us 
                through our support system.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;