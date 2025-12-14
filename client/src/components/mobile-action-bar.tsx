import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Heart, Share2 } from "lucide-react";
import { Link } from "wouter";
import type { Property } from "@/lib/types";

interface MobileActionBarProps {
  property: Property;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}

export function MobileActionBar({
  property,
  isFavorited,
  onToggleFavorite,
}: MobileActionBarProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return null;
  }

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 shadow-xl z-40 safe-area-inset-bottom"
      data-testid="mobile-action-bar"
    >
      <div className="grid grid-cols-3 gap-2 p-3 max-w-lg mx-auto">
        <Link href={`/apply?propertyId=${property.id}`}>
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12"
            data-testid="button-mobile-apply"
          >
            Apply
          </Button>
        </Link>
        <Button
          onClick={onToggleFavorite}
          variant={isFavorited ? "default" : "outline"}
          className={
            isFavorited
              ? "w-full bg-red-500 hover:bg-red-600 text-white font-bold h-12"
              : "w-full text-primary border-primary hover:bg-primary/5 font-bold h-12"
          }
          data-testid={isFavorited ? "button-mobile-unsave" : "button-mobile-save"}
        >
          <Heart
            className={`h-4 w-4 ${isFavorited ? "fill-white" : ""}`}
          />
        </Button>
        <Button
          onClick={() => {
            navigator.share?.({
              title: property.title,
              text: `Check out this property: ${property.title}`,
              url: window.location.href,
            });
          }}
          variant="outline"
          className="w-full text-primary border-primary hover:bg-primary/5 font-bold h-12"
          data-testid="button-mobile-share"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
      {/* Safe area for notch devices */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  );
}
