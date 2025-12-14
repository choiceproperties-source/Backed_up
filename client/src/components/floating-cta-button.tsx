import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export function FloatingCTAButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after hero section (600px)
      setIsVisible(window.scrollY > 600);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="md:hidden fixed bottom-6 left-6 z-30 animate-bounce">
      <Link href="/properties">
        <Button
          size="lg"
          className="rounded-full shadow-lg bg-secondary hover:bg-secondary/90 text-primary-foreground font-bold gap-2 h-14 px-6"
          data-testid="button-floating-search"
        >
          <Search className="h-5 w-5" />
          <span>Find Home</span>
        </Button>
      </Link>
    </div>
  );
}
