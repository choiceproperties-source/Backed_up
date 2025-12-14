import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PropertyCard } from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProperties } from "@/hooks/use-properties";
import type { Property } from "@/lib/types";
import { Heart, Share2, DollarSign, Bed, Bath, Maximize } from "lucide-react";
import { updateMetaTags } from "@/lib/seo";

export default function Buy() {
  const { properties: allProperties = [], loading } = useProperties();
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const [bedrooms, setBedrooms] = useState(0);

  useEffect(() => {
    updateMetaTags({
      title: "Buy a Home - Choice Properties",
      description: "Browse homes for sale. Find your dream home with Choice Properties - your trusted real estate partner.",
      image: "https://choiceproperties.com/og-image.png",
      url: "https://choiceproperties.com/buy"
    });
  }, []);

  useEffect(() => {
    const properties = allProperties.filter((p: Property) => p.property_type === 'house' || p.property_type === 'condo');
    
    const filtered = properties.filter((p: Property) => {
      const price = p.price ? (typeof p.price === 'string' ? parseFloat(p.price) : p.price) : 0;
      return price >= priceRange[0] && 
        price <= priceRange[1] &&
        (bedrooms === 0 || (p.bedrooms || 0) >= bedrooms);
    });
    
    setFilteredProperties(filtered);
  }, [allProperties, priceRange, bedrooms]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="bg-gradient-to-r from-primary to-secondary text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Buy Your Dream Home</h1>
          <p className="text-white/90">Browse available properties for sale</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-20">
              <h3 className="font-bold text-lg mb-6">Filters</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="font-semibold text-sm mb-2 block">Price Range</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="Min"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                      className="w-1/2 px-2 py-1 border rounded text-sm bg-background dark:border-gray-700"
                    />
                    <input 
                      type="number" 
                      placeholder="Max"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="w-1/2 px-2 py-1 border rounded text-sm bg-background dark:border-gray-700"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">${priceRange[0].toLocaleString()} - ${priceRange[1].toLocaleString()}</p>
                </div>

                <div>
                  <label className="font-semibold text-sm mb-2 block">Minimum Bedrooms</label>
                  <select 
                    value={bedrooms}
                    onChange={(e) => setBedrooms(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded bg-background dark:border-gray-700"
                  >
                    <option value="0">Any</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                  </select>
                </div>
              </div>
            </Card>
          </div>

          {/* Properties Grid */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="font-bold text-2xl">{filteredProperties.length} Properties For Sale</h2>
            </div>

            {filteredProperties.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No properties match your criteria</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredProperties.map(property => (
                  <PropertyCard key={property.id} property={property} onQuickView={() => {}} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
