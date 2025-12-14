import { Link } from "wouter";
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/lib/pwa";

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletterSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      const subscribers = JSON.parse(localStorage.getItem("choiceProperties_newsletter") || "[]");
      if (!subscribers.includes(email)) {
        subscribers.push(email);
        localStorage.setItem("choiceProperties_newsletter", JSON.stringify(subscribers));
      }
      trackEvent("newsletter_signup", { email });
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 3000);
    }
  };
  return (
    <footer className="bg-primary text-primary-foreground" role="contentinfo" aria-label="Site footer">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="font-heading text-2xl font-bold text-white">
              Choice<span className="text-secondary">Properties</span>
            </h3>
            <p className="text-primary-foreground/80 text-sm">
              Helping you find the perfect place to call home. Professional, reliable, and dedicated to your comfort.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-heading text-lg font-semibold text-secondary">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/properties" className="hover:text-secondary transition-colors">
                  All Properties
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-secondary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-secondary transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-secondary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-secondary transition-colors">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="font-heading text-lg font-semibold text-secondary">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-secondary" />
                <span>2265 Livernois, Suite 500, Troy, MI 48083</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-secondary" />
                <span>+1 (707) 706-3137</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-secondary" />
                <span>info@choiceproperties.com</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h4 className="font-heading text-lg font-semibold text-secondary">Newsletter</h4>
            <p className="text-primary-foreground/80 text-sm">
              Get the latest listings and updates delivered to your inbox.
            </p>
            <form onSubmit={handleNewsletterSubscribe} className="space-y-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Email for newsletter subscription"
                className="bg-primary-foreground/10 border-primary-foreground/30 text-white placeholder:text-primary-foreground/50"
              />
              <Button
                type="submit"
                size="sm"
                className="w-full bg-secondary hover:bg-secondary/90 text-primary-foreground"
              >
                <span className="flex items-center gap-2 justify-center">
                  {subscribed && <CheckCircle className="h-4 w-4" />}
                  {subscribed ? "Subscribed" : "Subscribe"}
                </span>
              </Button>
            </form>
          </div>
        </div>

        {/* Socials */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/20">
          <div className="flex justify-center space-x-6 mb-6">
            <a 
              href="#" 
              className="hover:text-secondary transition-colors"
              aria-label="Follow us on Facebook"
              title="Facebook"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a 
              href="#" 
              className="hover:text-secondary transition-colors"
              aria-label="Follow us on Instagram"
              title="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a 
              href="#" 
              className="hover:text-secondary transition-colors"
              aria-label="Follow us on Twitter"
              title="Twitter"
            >
              <Twitter className="h-5 w-5" />
            </a>
          </div>
          <p className="text-center text-sm text-primary-foreground/60">
            &copy; {new Date().getFullYear()} Choice Properties. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
