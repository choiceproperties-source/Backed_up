import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "Browse", id: "browse", offset: 600 },
  { label: "How It Works", id: "how-it-works", offset: 1200 },
  { label: "Why Us", id: "why-us", offset: 1800 },
  { label: "Properties", id: "properties", offset: 2400 },
  { label: "Reviews", id: "reviews", offset: 3000 },
];

export function StickyNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 600);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (offset: number) => {
    window.scrollTo({ top: offset, behavior: "smooth" });
    setIsOpen(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:block sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-center gap-2">
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={() => scrollToSection(item.offset)}
                className="text-foreground hover:text-secondary font-medium"
                data-testid={`button-nav-${item.id}`}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden fixed bottom-6 right-6 z-40">
        <Button
          size="icon"
          className="rounded-full shadow-lg bg-secondary hover:bg-secondary/90 h-14 w-14"
          onClick={() => setIsOpen(!isOpen)}
          data-testid="button-mobile-menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 bg-background border border-border/30 rounded-2xl shadow-2xl p-2 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={() => scrollToSection(item.offset)}
                className="justify-start text-foreground hover:text-secondary font-medium w-40"
                data-testid={`button-mobile-nav-${item.id}`}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
