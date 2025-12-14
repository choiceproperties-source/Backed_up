import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Search, MapPin, DollarSign, Bed, Sparkles } from 'lucide-react';

const POPULAR_LOCATIONS = [
  'Downtown',
  'Midtown',
  'Suburbs',
  'Waterfront',
  'West Side',
  'East Village',
];

export function EnhancedPropertySearch() {
  const [location, setLocation] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches] = useState<string[]>(['Troy, MI', 'Detroit, MI']);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = 'location-suggestions';

  const filteredLocations = POPULAR_LOCATIONS.filter((loc) =>
    loc.toLowerCase().includes(location.toLowerCase())
  );

  const allSuggestions = location.length === 0 ? recentSearches : filteredLocations.slice(0, 5);

  const buildSearchParams = () => {
    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    if (bedrooms) params.append('bedrooms', bedrooms);
    return params.toString() ? `?${params.toString()}` : '';
  };

  const selectSuggestion = useCallback((value: string) => {
    setLocation(value);
    setShowSuggestions(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || allSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev < allSuggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : allSuggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < allSuggestions.length) {
          selectSuggestion(allSuggestions[activeIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setActiveIndex(-1);
        break;
    }
  }, [showSuggestions, allSuggestions, activeIndex, selectSuggestion]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
      activeElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div 
        className="relative bg-white rounded-2xl md:rounded-full shadow-2xl p-2 md:p-3 overflow-visible ring-4 ring-white/30"
        role="search"
        aria-label="Property search"
      >
        
        <div className="relative grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
          <div className="md:col-span-4 relative" ref={containerRef}>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Where do you want to live?"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setActiveIndex(-1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-muted/70 transition-all"
                data-testid="input-search-location"
                aria-label="Location search"
                aria-expanded={showSuggestions && allSuggestions.length > 0}
                aria-autocomplete="list"
                aria-controls={showSuggestions ? listId : undefined}
                aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
                role="combobox"
              />
            </div>
            
            {showSuggestions && allSuggestions.length > 0 && (
              <div 
                ref={listRef}
                id={listId}
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-border z-50 overflow-hidden"
                role="listbox"
                aria-label={location.length === 0 ? 'Recent searches' : 'Location suggestions'}
              >
                <div className="p-2">
                  <p className="text-xs text-muted-foreground px-2 py-1" aria-hidden="true">
                    {location.length === 0 ? 'Recent Searches' : 'Popular Areas'}
                  </p>
                  {allSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      id={`suggestion-${idx}`}
                      data-index={idx}
                      role="option"
                      aria-selected={idx === activeIndex}
                      onClick={() => selectSuggestion(item)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`w-full text-left px-3 py-2 text-sm text-foreground rounded-lg flex items-center gap-2 transition-colors ${
                        idx === activeIndex ? 'bg-muted' : 'hover:bg-muted'
                      }`}
                    >
                      {location.length === 0 ? (
                        <Search className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <MapPin className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      )}
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2 relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
            <input
              type="number"
              placeholder="Min $"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-muted/70 transition-all"
              data-testid="input-search-min-price"
              aria-label="Minimum monthly rent in dollars"
            />
          </div>

          <div className="md:col-span-2 relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
            <input
              type="number"
              placeholder="Max $"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-muted/70 transition-all"
              data-testid="input-search-max-price"
              aria-label="Maximum monthly rent in dollars"
            />
          </div>

          <div className="md:col-span-2 relative">
            <Bed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
            <select
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-muted/70 transition-all appearance-none cursor-pointer"
              data-testid="select-search-bedrooms"
              aria-label="Number of bedrooms"
            >
              <option value="" className="bg-background text-foreground">Beds</option>
              <option value="1" className="bg-background text-foreground">1 Bed</option>
              <option value="2" className="bg-background text-foreground">2 Beds</option>
              <option value="3" className="bg-background text-foreground">3 Beds</option>
              <option value="4" className="bg-background text-foreground">4+ Beds</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <Link href={`/properties${buildSearchParams()}`}>
              <Button 
                size="lg"
                className="w-full bg-secondary hover:bg-secondary/90 text-primary-foreground font-bold rounded-xl h-12 shadow-lg hover:shadow-xl transition-all group"
                data-testid="button-search-properties"
              >
                <Search className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" aria-hidden="true" />
                Search
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mt-4" role="group" aria-label="Quick property filters">
        <span className="text-white/60 text-sm flex items-center gap-1">
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          Popular:
        </span>
        {[
          { label: 'Apartments', filter: 'apartments' },
          { label: 'Houses', filter: 'houses' },
          { label: 'Pet Friendly', filter: 'pet-friendly' },
          { label: 'Near Transit', filter: 'near-transit' },
        ].map((tag, idx) => (
          <Link key={idx} href={`/properties?type=${tag.filter}`}>
            <Button
              variant="ghost"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/20"
              data-testid={`quick-filter-${tag.filter}`}
              aria-label={`Filter by ${tag.label}`}
            >
              {tag.label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
