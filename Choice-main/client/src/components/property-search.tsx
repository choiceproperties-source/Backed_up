import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

export function PropertySearch() {
  const [location, setLocation] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');

  const buildSearchParams = () => {
    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    if (bedrooms) params.append('bedrooms', bedrooms);
    return params.toString() ? `?${params.toString()}` : '';
  };

  return (
    <div 
      className="w-full bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-2xl p-6 md:p-8 backdrop-blur-sm"
      data-aos="fade-up"
      data-aos-delay="300"
    >
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        {/* Location */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Location</label>
          <input
            type="text"
            placeholder="City or neighborhood"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="input-search-location"
          />
        </div>

        {/* Min Price */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Min Price</label>
          <input
            type="number"
            placeholder="$500"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="input-search-min-price"
          />
        </div>

        {/* Max Price */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Max Price</label>
          <input
            type="number"
            placeholder="$5000"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="input-search-max-price"
          />
        </div>

        {/* Bedrooms */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Bedrooms</label>
          <select
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            className="px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            data-testid="select-search-bedrooms"
          >
            <option value="">Any</option>
            <option value="1">1 Bedroom</option>
            <option value="2">2 Bedrooms</option>
            <option value="3">3 Bedrooms</option>
            <option value="4">4+ Bedrooms</option>
          </select>
        </div>

        {/* Search Button */}
        <Link href={`/properties${buildSearchParams()}`}>
          <Button 
            size="lg"
            className="w-full bg-secondary hover:bg-secondary/90 text-primary-foreground font-bold"
            data-testid="button-search-properties"
          >
            <Search className="h-5 w-5 mr-2" />
            Search
          </Button>
        </Link>
      </div>
    </div>
  );
}
