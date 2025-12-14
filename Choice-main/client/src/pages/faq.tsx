import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card } from '@/components/ui/card';
import { ChevronDown } from 'lucide-react';
import { updateMetaTags } from "@/lib/seo";

const FAQ_ITEMS = [
  {
    category: 'Renting',
    items: [
      {
        q: 'How do I apply for a rental property?',
        a: 'Visit the property listing, click "Apply Now", and fill out the rental application form with your personal, employment, and reference information. You can track your application status in "My Applications".'
      },
      {
        q: 'What documents do I need for a rental application?',
        a: 'Typically you\'ll need proof of income, employment verification, references from previous landlords, and a valid ID. Some properties may request additional documents.'
      },
      {
        q: 'Can I save my favorite properties?',
        a: 'Yes! Click the heart icon on any property to add it to your favorites. You can view all saved properties in the Favorites dropdown in the navbar.'
      },
      {
        q: 'How are application fees used?',
        a: 'Application fees cover the cost of background checks, credit verification, and reference checks. These fees are typically non-refundable.'
      }
    ]
  },
  {
    category: 'Buying',
    items: [
      {
        q: 'How do I use the mortgage calculator?',
        a: 'Enter your home price, down payment, interest rate, and loan term. The calculator will show your estimated monthly payment, total interest, and an amortization chart showing your payment breakdown over time.'
      },
      {
        q: 'What does the amortization schedule show?',
        a: 'The amortization schedule breaks down each payment into principal and interest portions, showing how your loan balance decreases over time. Early payments go mostly to interest.'
      },
      {
        q: 'How do property taxes affect my payment?',
        a: 'Property taxes are annual costs shown separately from your mortgage. While not included in the mortgage payment itself, they\'re an important part of your total housing costs.'
      },
      {
        q: 'What is an HOA fee?',
        a: 'HOA (Homeowners Association) fees are monthly or annual charges for maintaining common areas in developments like condos or planned communities.'
      }
    ]
  },
  {
    category: 'Selling',
    items: [
      {
        q: 'How do I list my property for sale?',
        a: 'Click "Sell" in the navbar, then follow the 3-step form to enter your property details, location, and asking price. Our team will review and activate your listing within 24 hours.'
      },
      {
        q: 'Can I list my property for rent instead?',
        a: 'Yes! When listing your property, you can choose whether you want to list it for sale, rent, or both. Choose the option that best fits your needs.'
      },
      {
        q: 'How long does it take for my listing to go live?',
        a: 'After submission, our team reviews your listing within 24 hours. Once approved, your property will be visible to thousands of potential buyers and renters.'
      },
      {
        q: 'Can I edit my listing after posting?',
        a: 'Yes, you can edit most listing details through your account. Contact our support team for changes to pricing or major property details.'
      }
    ]
  },
  {
    category: 'Account & Agents',
    items: [
      {
        q: 'Do I need to create an account?',
        a: 'Creating an account lets you save favorites, track applications, and manage your listings. You can browse properties without an account, but won\'t be able to apply or save preferences.'
      },
      {
        q: 'How do I find an agent?',
        a: 'Visit the Agents page to browse and search agents in your area. Filter by specialty, location, and rating to find the right agent for your needs.'
      },
      {
        q: 'What does a verified badge mean?',
        a: 'Verified agents have passed our background checks and meet our standards for professionalism, experience, and customer service.'
      },
      {
        q: 'How are agents rated?',
        a: 'Agents are rated by customers based on their experience. Ratings include professionalism, communication, knowledge, and results.'
      }
    ]
  }
];

interface FAQItem {
  q: string;
  a: string;
}

interface FAQCategory {
  category: string;
  items: FAQItem[];
}

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <h4 className="font-semibold text-left text-primary">{item.q}</h4>
        <ChevronDown className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t dark:border-gray-700 text-gray-700 dark:text-gray-300">
          <p>{item.a}</p>
        </div>
      )}
    </Card>
  );
}

export default function FAQ() {
  useEffect(() => {
    updateMetaTags({
      title: "FAQ - Choice Properties",
      description: "Find answers to frequently asked questions about renting, buying, selling, and listing properties with Choice Properties.",
      image: "https://choiceproperties.com/og-image.png",
      url: "https://choiceproperties.com/faq"
    });
  }, []);

  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="bg-gradient-to-r from-primary to-secondary text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Frequently Asked Questions</h1>
          <p className="text-white/90">Find answers to common questions about renting, buying, and selling</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {/* Category Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-4 sticky top-20">
              <h3 className="font-bold text-lg mb-4">Categories</h3>
              <div className="space-y-2">
                {FAQ_ITEMS.map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveCategory(idx)}
                    className={`w-full text-left px-4 py-2 rounded font-medium transition-colors ${
                      activeCategory === idx
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {cat.category}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* FAQ Content */}
          <div className="lg:col-span-3">
            <div>
              <h2 className="text-3xl font-bold text-primary mb-8">{FAQ_ITEMS[activeCategory]?.category} Questions</h2>
              <div className="space-y-4">
                {FAQ_ITEMS[activeCategory]?.items.map((item, idx) => (
                  <FAQAccordion key={idx} item={item} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
