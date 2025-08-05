import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Terms of Service</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lately Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">Effective Date: July 21, 2025</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <div className="text-muted-foreground leading-relaxed mb-6">
              <p>Welcome to Lately ("we," "us," "our"). These Terms of Service ("Terms") govern your access to and use of our mobile app, website, and related services (collectively, the "Platform"). By accessing or using Lately, you agree to be bound by these Terms.</p>
              <p className="mt-2"><strong>If you do not agree to these Terms, do not use the Platform.</strong></p>
            </div>

            <section>
              <h3 className="text-lg font-semibold mb-3">1. Service Description</h3>
              <p className="text-muted-foreground leading-relaxed">
                Lately is a platform that helps users discover and book last-minute self-care services such as facials, injectables, wellness treatments, and grooming services with third-party providers ("Providers"). We do not directly provide any services listed on the platform.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">2. User Eligibility</h3>
              <p className="text-muted-foreground leading-relaxed">
                You must be at least 18 years old to use the Platform. By using Lately, you represent and warrant that you meet this requirement.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">3. Independent Providers</h3>
              <div className="text-muted-foreground leading-relaxed space-y-2">
                <p>All services booked through Lately are performed by third-party Providers who are not employees, agents, or representatives of Lately. We do not supervise or control the quality, timing, legality, or safety of the services provided.</p>
                <p>Lately is not responsible for any injury, loss, damage, or claim that may arise during or after a service appointment. Any dispute or issue regarding a booked service must be addressed directly with the Provider.</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">4. Payment Terms</h3>
              <div className="text-muted-foreground leading-relaxed space-y-2">
                <p>When you book a service through Lately, you authorize us to charge your selected payment method (via Stripe, Apple Pay, or other supported gateways) for the full amount, including any booking fees or taxes.</p>
                <p>Providers receive payment directly from Lately via Stripe Connect. Lately may retain a small platform or service fee, which will be disclosed during checkout.</p>
                <p>All bookings are final unless the Provider's cancellation policy allows otherwise.</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">5. Fees</h3>
              <p className="text-muted-foreground leading-relaxed">
                Lately may charge a non-refundable booking fee (e.g. $1–$2) per transaction. This will be clearly disclosed before you complete your booking. Providers may also charge their own cancellation or late fees, which are subject to their individual policies.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">6. User Conduct</h3>
              <div className="text-muted-foreground leading-relaxed space-y-2">
                <p>You agree not to:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Use the Platform for unlawful or harmful purposes;</li>
                  <li>Harass, threaten, or abuse Providers or other users;</li>
                  <li>Attempt to circumvent our payment system;</li>
                  <li>Use bots, scrapers, or other automated methods to access the Platform.</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">7. Account Security</h3>
              <p className="text-muted-foreground leading-relaxed">
                You are responsible for maintaining the confidentiality of your account and login information. You agree to notify us immediately if you suspect unauthorized use of your account.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">8. Platform Availability</h3>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify, suspend, or discontinue the Platform at any time, for any reason, without notice. We are not liable for any interruption or loss of access.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">9. Disclaimers</h3>
              <div className="text-muted-foreground leading-relaxed space-y-2">
                <ul className="list-disc list-inside space-y-1">
                  <li>Lately is not responsible for the quality, safety, legality, or outcome of services rendered by Providers.</li>
                  <li>We make no guarantees about availability, accuracy, or reliability of listed services or appointment times.</li>
                  <li>Your use of the Platform is at your own risk.</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">10. Limitation of Liability</h3>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by law, Lately and its affiliates, officers, and employees will not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Platform.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">11. Indemnification</h3>
              <p className="text-muted-foreground leading-relaxed">
                You agree to indemnify and hold harmless Lately and its affiliates from any claims, damages, losses, or liabilities, including legal fees, arising out of your use of the Platform or any violation of these Terms.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">12. Dispute Resolution & Governing Law</h3>
              <p className="text-muted-foreground leading-relaxed">
                These Terms are governed by the laws of the State of California. Any disputes arising out of or relating to these Terms or the Platform will be resolved through binding arbitration in Los Angeles, California.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">13. Changes to Terms</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may update these Terms from time to time. When we do, we'll post the updated version and revise the "Effective Date" above. Your continued use of the Platform after changes means you accept the new Terms.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">14. Legal Disclosure</h3>
              <p className="text-muted-foreground leading-relaxed">
                Lately is a registered DBA of Flying Dumbo Productions LLC.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">15. Questions?</h3>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms, reach out to us through the 'Need Help?' function in the app.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;