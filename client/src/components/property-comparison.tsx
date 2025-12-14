import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { X, Bed, Bath, Maximize, MapPin, Star, Calendar, PawPrint, Sofa, CheckCircle, XCircle } from "lucide-react";
import type { Property, PropertyWithOwner } from "@/lib/types";

interface ComparisonProps {
  properties: PropertyWithOwner[];
  isOpen: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
}

export function PropertyComparison({ properties, isOpen, onClose, onRemove }: ComparisonProps) {
  if (properties.length === 0) return null;

  const formatPrice = (price: string | null | undefined) => {
    if (!price) return "N/A";
    return `$${parseInt(price).toLocaleString()}`;
  };

  const getBestValue = (values: (number | null)[]) => {
    const validValues = values.filter(v => v !== null) as number[];
    if (validValues.length === 0) return -1;
    return values.indexOf(Math.min(...validValues));
  };

  const getHighestValue = (values: (number | null)[]) => {
    const validValues = values.filter(v => v !== null) as number[];
    if (validValues.length === 0) return -1;
    return values.indexOf(Math.max(...validValues));
  };

  const priceValues = properties.map(p => p.price ? parseInt(p.price) : null);
  const sqftValues = properties.map(p => p.square_feet);
  const bestPriceIndex = getBestValue(priceValues);
  const bestSqftIndex = getHighestValue(sqftValues);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Compare Properties 
            <span className="text-sm font-normal text-muted-foreground">({properties.length} selected)</span>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-semibold w-40">Feature</th>
                {properties.map((p) => (
                  <th key={p.id} className="p-4 min-w-[220px]">
                    <div className="space-y-2 text-left">
                      <p className="font-semibold text-primary line-clamp-2">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.address}</p>
                      <button
                        onClick={() => onRemove(p.id)}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                      >
                        <X className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-4 font-semibold">Monthly Rent</td>
                {properties.map((p, idx) => (
                  <td key={p.id} className={`p-4 font-bold text-lg ${idx === bestPriceIndex ? 'text-green-600 dark:text-green-400' : 'text-primary'}`}>
                    {formatPrice(p.price)}/mo
                    {idx === bestPriceIndex && <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">Best Price</span>}
                  </td>
                ))}
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-4 font-semibold flex items-center gap-2">
                  <Bed className="h-4 w-4 text-primary" /> Bedrooms
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-4">{p.bedrooms || 'N/A'} beds</td>
                ))}
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-4 font-semibold flex items-center gap-2">
                  <Bath className="h-4 w-4 text-primary" /> Bathrooms
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-4">{p.bathrooms || 'N/A'} baths</td>
                ))}
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-4 font-semibold flex items-center gap-2">
                  <Maximize className="h-4 w-4 text-primary" /> Square Feet
                </td>
                {properties.map((p, idx) => (
                  <td key={p.id} className={`p-4 ${idx === bestSqftIndex ? 'text-green-600 dark:text-green-400 font-semibold' : ''}`}>
                    {p.square_feet ? p.square_feet.toLocaleString() : 'N/A'} sqft
                    {idx === bestSqftIndex && <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">Largest</span>}
                  </td>
                ))}
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-4 font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Location
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-4 text-sm">{p.city || 'N/A'}, {p.state || ''}</td>
                ))}
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-4 font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Lease Term
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-4">{p.lease_term || '12 months'}</td>
                ))}
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-4 font-semibold flex items-center gap-2">
                  <PawPrint className="h-4 w-4 text-primary" /> Pets Allowed
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-4">
                    {p.pets_allowed ? (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" /> Yes
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500">
                        <XCircle className="h-4 w-4" /> No
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-4 font-semibold flex items-center gap-2">
                  <Sofa className="h-4 w-4 text-primary" /> Furnished
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-4">
                    {p.furnished ? (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" /> Yes
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <XCircle className="h-4 w-4" /> No
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-4 font-semibold flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" /> Rating
                </td>
                {properties.map((p) => {
                  const rating = p.average_rating || (p.reviews?.length 
                    ? p.reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / p.reviews.length 
                    : null);
                  return (
                    <td key={p.id} className="p-4">
                      {rating ? (
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {rating.toFixed(1)}
                          {p.reviews?.length && <span className="text-muted-foreground">({p.reviews.length})</span>}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No reviews</span>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="p-4"></td>
                {properties.map((p) => (
                  <td key={p.id} className="p-4">
                    <Link href={`/property/${p.id}`}>
                      <Button size="sm" className="w-full">View Details</Button>
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
