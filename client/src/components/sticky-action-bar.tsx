import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageCircle, Heart, Share2, ChevronUp } from "lucide-react";
import { formatPrice } from "@/lib/types";

interface StickyActionBarProps {
  price: number;
  propertyId: string;
  propertyTitle: string;
  onContactClick: () => void;
  onScheduleClick: () => void;
  onCallClick?: () => void;
  isFavorited: boolean;
  onFavoriteClick: () => void;
  agentPhone?: string;
}

export function StickyActionBar({
  price,
  propertyId,
  propertyTitle,
  onContactClick,
  onScheduleClick,
  onCallClick,
  isFavorited,
  onFavoriteClick,
  agentPhone,
}: StickyActionBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: propertyTitle,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <>
      <div 
        className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t shadow-2xl md:hidden transform transition-transform"
        data-testid="sticky-action-bar"
      >
        {isExpanded && (
          <div className="p-4 border-b dark:border-gray-800 animate-in slide-in-from-bottom duration-200">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={onFavoriteClick}
                data-testid="button-sticky-save"
              >
                <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                {isFavorited ? 'Saved' : 'Save'}
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={handleShare}
                data-testid="button-sticky-share"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
            {agentPhone && (
              <Button
                variant="outline"
                className="w-full mt-3 flex items-center justify-center gap-2"
                onClick={onCallClick}
                data-testid="button-sticky-call"
              >
                <Phone className="h-4 w-4" />
                Call {agentPhone}
              </Button>
            )}
          </div>
        )}
        
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-2xl font-bold">{formatPrice(price)}</span>
              <span className="text-muted-foreground">/mo</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid="button-expand-actions"
            >
              <ChevronUp className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <Button
              onClick={onContactClick}
              className="flex items-center gap-2 bg-primary"
              data-testid="button-sticky-contact"
            >
              <MessageCircle className="h-4 w-4" />
              Contact
            </Button>
          </div>
        </div>
      </div>

      <div className="h-[140px] md:hidden" aria-hidden="true" />
    </>
  );
}

export function DesktopActionCard({
  price,
  onContactClick,
  onScheduleClick,
  onCallClick,
  isFavorited,
  onFavoriteClick,
  agentPhone,
  agentName,
  agentImage,
  responseTime,
}: StickyActionBarProps & {
  agentName?: string;
  agentImage?: string;
  responseTime?: string;
}) {
  return (
    <div className="hidden md:block sticky top-24 space-y-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border p-6 space-y-4">
        <div className="text-center pb-4 border-b dark:border-gray-800">
          <span className="text-3xl font-bold">{formatPrice(price)}</span>
          <span className="text-xl text-muted-foreground">/mo</span>
        </div>

        <div className="space-y-3">
          <Button
            onClick={onContactClick}
            className="w-full flex items-center justify-center gap-2"
            size="lg"
            data-testid="button-desktop-contact"
          >
            <MessageCircle className="h-5 w-5" />
            Send Message
          </Button>

          {agentPhone && (
            <Button
              onClick={onCallClick}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              size="lg"
              data-testid="button-desktop-call"
            >
              <Phone className="h-5 w-5" />
              {agentPhone}
            </Button>
          )}
        </div>

        {responseTime && (
          <div className="text-center pt-2">
            <Badge variant="secondary" className="text-xs">
              Usually responds {responseTime}
            </Badge>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t dark:border-gray-800">
          <Button
            variant="ghost"
            className="flex-1 flex items-center justify-center gap-2"
            onClick={onFavoriteClick}
            data-testid="button-desktop-save"
          >
            <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            {isFavorited ? 'Saved' : 'Save'}
          </Button>
          <Button
            variant="ghost"
            className="flex-1 flex items-center justify-center gap-2"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'Property', url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            data-testid="button-desktop-share"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}
