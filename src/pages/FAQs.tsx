import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const FAQs = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const faqs = [
    {
      question: "How does it work?",
      answer: "Lately partners with salons, spas, and wellness providers to offer last-minute openings at discounted prices. Just browse what's available today, book in a few taps, and show up!"
    },
    {
      question: "Are the prices always discounted?",
      answer: "Yes! All appointments listed on Lately are discounted because they're same-day. It's a win-win — you save, and providers fill open spots."
    },
    {
      question: "Can I book for another day?",
      answer: "Not yet. Lately is designed for same-day booking only — but that's part of the fun."
    },
    {
      question: "What types of appointments are offered?",
      answer: "Everything from facials and massages to brows, nails, hair, cold plunges and more. The selection changes daily based on last-min availability."
    },
    {
      question: "Is tipping included?",
      answer: "Tipping is not required and should be handled in person with your provider if you choose to tip."
    },
    {
      question: "What if I need to cancel or reschedule?",
      answer: "Since these are last-minute bookings, all appointments are final and non-refundable. Please double-check your time before confirming."
    },
    {
      question: "How do I know the providers are legit?",
      answer: "We only work with vetted professionals. You can even view their Instagram before you book."
    },
    {
      question: "Can I contact someone if I need help?",
      answer: (
        <>
          Sure! You can reach us{" "}
          <button
            onClick={() => {
              // Trigger the help button functionality
              const helpButton = document.querySelector('[data-help-button]') as HTMLButtonElement;
              if (helpButton) {
                helpButton.click();
              }
            }}
            className="text-primary hover:underline font-medium"
          >
            here
          </button>
          .
        </>
      )
    }
  ];

  // Filter FAQs based on search query
  const filteredFaqs = faqs.filter(faq => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const questionMatch = faq.question.toLowerCase().includes(query);
    const answerMatch = typeof faq.answer === 'string' 
      ? faq.answer.toLowerCase().includes(query)
      : false;
    
    return questionMatch || answerMatch;
  });

  // Function to highlight matching text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-background py-12">
        <div className="container mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          
          <h1 className="text-4xl font-playfair font-bold text-foreground mb-4">
            FAQs
          </h1>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about Lately
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {/* About Lately Section */}
        <section className="mb-16">
          <Card className="border-primary/20">
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                What is Lately?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Lately is your new home for last-minute self-care. We help you book same-day beauty and wellness appointments at a discount, from trusted providers nearby. Whether you're feeling spontaneous or just need a little you-time, we make it easy to treat yourself — today.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Frequently Asked Questions Section */}
        <section>
          <h2 className="text-3xl font-playfair font-bold text-foreground mb-8 text-center">
            Frequently Asked Questions
          </h2>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search FAQs (e.g., cancellation, payment, booking...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full bg-white border-black border-2"
              />
            </div>
          </div>
          
          <div className="space-y-6 max-w-3xl mx-auto">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      {typeof faq.question === 'string' 
                        ? highlightText(faq.question, searchQuery)
                        : faq.question
                      }
                    </h3>
                    <div className="text-muted-foreground leading-relaxed">
                      {typeof faq.answer === 'string' 
                        ? highlightText(faq.answer, searchQuery)
                        : faq.answer
                      }
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="text-center">
                <CardContent className="p-8">
                  <p className="text-muted-foreground text-lg">
                    No FAQs found matching "{searchQuery}". Try a different search term.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="text-center mt-16 mb-8">
          <Link to="/services">
            <Button size="lg" className="text-lg px-8 py-6">
              Start Booking Today
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FAQs;