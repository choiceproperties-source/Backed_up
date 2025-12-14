import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Bed, Bath, Maximize, MapPin, X, Share2, Heart } from "lucide-react";
import type { Property } from "@/lib/types";
import { formatPrice, parseDecimal } from "@/lib/types";

interface QuickViewProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
}

const placeholders: Record<string, string> = {
  "placeholder-exterior": "https://images.unsplash.com/photo-1560518883-ce09059eeffa",
  "placeholder-living": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267",
  "placeholder-kitchen": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136",
  "placeholder-bedroom": "https://images.unsplash.com/photo-1540932239986-310128078ceb"
};

export function PropertyQuickView({ property, isOpen, onClose }: QuickViewProps) {
  const [copied, setCopied] = useState(false);

  if (!property) return null;

  const handleShare = () => {
    const url = `${window.location.origin}/property/${property.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe access to images array
  const firstImage = property.images?.[0];
  const image = firstImage ? placeholders[firstImage] : placeholders["placeholder-exterior"];
  
  // Convert price to number for display
  const priceNum = parseInt(property.price || "0");
  const bathroomNum = Math.round(parseDecimal(property.bathrooms));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quick View</DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <img
            src={image}
            alt={property.title}
            className="w-full h-64 object-cover rounded-lg"
            loading="lazy"
          />

          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold">{formatPrice(property.price)}</h3>
              <p className="text-gray-600">/month</p>
            </div>

            <p className="text-gray-700 font-medium">{property.title}</p>

            <div className="flex gap-6 text-sm">
              <div>
                <div className="font-bold text-primary">{property.bedrooms || 0}</div>
                <div className="text-gray-600">Beds</div>
              </div>
              <div>
                <div className="font-bold text-primary">{bathroomNum}</div>
                <div className="text-gray-600">Baths</div>
              </div>
              <div>
                <div className="font-bold text-primary">{property.square_feet ? property.square_feet.toLocaleString() : 'N/A'}</div>
                <div className="text-gray-600">sqft</div>
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{property.address}, {property.city}, {property.state} {property.zip_code}</span>
            </div>

            <p className="text-sm text-gray-700 line-clamp-3">{property.description}</p>

            <div className="flex gap-2 pt-4">
              <Link href={`/property/${property.id}`}>
                <Button className="flex-1 bg-primary hover:bg-primary/90">
                  View Details
                </Button>
              </Link>
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
                title="Share property"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
