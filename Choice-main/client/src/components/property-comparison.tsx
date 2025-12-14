import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { X, Bed, Bath, Maximize, DollarSign, MapPin } from "lucide-react";
import type { Property } from "@/lib/types";

interface ComparisonProps {
  properties: Property[];
  isOpen: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
}

export function PropertyComparison({ properties, isOpen, onClose, onRemove }: ComparisonProps) {
  if (properties.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Compare Properties ({properties.length})</DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-semibold">Property</th>
                {properties.map((p) => (
                  <th key={p.id} className="p-3 min-w-[250px]">
                    <div className="space-y-2">
                      <p className="font-semibold text-primary">{p.title}</p>
                      <button
                        onClick={() => onRemove(p.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3 font-semibold">Price</td>
                {properties.map((p) => (
                  <td key={p.id} className="p-3 text-primary font-bold">
                    ${p.price.toLocaleString()}/mo
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-3 font-semibold flex items-center gap-2">
                  <Bed className="h-4 w-4" /> Bedrooms
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-3">{p.bedrooms}</td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-3 font-semibold flex items-center gap-2">
                  <Bath className="h-4 w-4" /> Bathrooms
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-3">{p.bathrooms}</td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-3 font-semibold flex items-center gap-2">
                  <Maximize className="h-4 w-4" /> Square Feet
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-3">{p.sqft.toLocaleString()}</td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-3 font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Location
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-3 text-sm">{p.city}, {p.state}</td>
                ))}
              </tr>
              <tr>
                <td className="p-3"></td>
                {properties.map((p) => (
                  <td key={p.id} className="p-3">
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
