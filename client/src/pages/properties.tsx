import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PropertyCard } from "@/components/property-card";
import { PropertyComparison } from "@/components/property-comparison";
import { Breadcrumb } from "@/components/breadcrumb";
import { NoResults } from "@/components/no-results";
import { PropertyQuickView } from "@/components/property-quick-view";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import MapView from "@/components/map-view";
import { useProperties } from "@/hooks/use-properties";
import type { Property, PropertyWithOwner } from "@/lib/types";
import { Search, Bookmark, Filter, Map, LayoutGrid, List, Scale, X } from "lucide-react";
import { toast } from "sonner";
import { updateMetaTags } from "@/lib/seo";
import { PropertyCardSkeletonGrid } from "@/components/skeleton-loaders";
import { PropertyListCard } from "@/components/property-list-card";

export default function Properties() {
  const { properties: allProperties, loading } = useProperties();
  const [filteredProperties, setFilteredProperties] = useState<Property[]>(allProperties);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [comparisonList, setComparisonList] = useState<PropertyWithOwner[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  useEffect(() => {
    updateMetaTags({
      title: "Rental Properties for Rent - Search Apartments & Homes | Choice Properties",
      description: "Search 500+ available rental properties in Troy, MI. Filter by price, bedrooms, bathrooms, and property type. Find and apply for your perfect rental home instantly.",
      image: "https://choiceproperties.com/og-image.png",
      url: "https://choiceproperties.com/properties"
    });
  }, []);
  const [sortBy, setSortBy] = useState("featured");
  const [quickViewProperty, setQuickViewProperty] = useState<Property | null>(null);

  useEffect(() => {
    setFilteredProperties(allProperties);
  }, [allProperties]);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  
  // Filters
  const [search, setSearch] = useState("");
  const [priceMin, setPriceMin] = useState("0");
  const [priceMax, setPriceMax] = useState("10000");
  const [bedrooms, setBedrooms] = useState("any");
  const [bathrooms, setBathrooms] = useState("any");
  const [homeType, setHomeType] = useState("any");
  const [savedSearches, setSavedSearches] = useState<Array<{search: string; priceMin: string; priceMax: string; bedrooms: string; bathrooms: string; homeType: string}>>(
    JSON.parse(localStorage.getItem("choiceProperties_savedSearches") || "[]")
  );

  useEffect(() => {
    let result = allProperties;

    if (search) {
      const query = search.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(query) || 
        p.address.toLowerCase().includes(query) ||
        (p.city?.toLowerCase().includes(query) || false)
      );
    }

    // Price range filter
    const minVal = parseInt(priceMin) || 0;
    const maxVal = parseInt(priceMax) || 10000;
    result = result.filter(p => {
      const price = p.price ? parseInt(p.price) : 0;
      return price >= minVal && price <= maxVal;
    });

    if (bedrooms !== "any") {
      const minBeds = parseInt(bedrooms);
      result = result.filter(p => (p.bedrooms || 0) >= minBeds);
    }

    if (bathrooms !== "any") {
      const minBaths = parseFloat(bathrooms);
      result = result.filter(p => (parseFloat(p.bathrooms || "0") || 0) >= minBaths);
    }

    if (homeType !== "any") {
        result = result.filter(p => p.property_type?.toLowerCase() === homeType.toLowerCase());
    }

    // Apply sorting
    if (sortBy === "price-low") {
      result = [...result].sort((a, b) => (parseInt(a.price || "0") || 0) - (parseInt(b.price || "0") || 0));
    } else if (sortBy === "price-high") {
      result = [...result].sort((a, b) => (parseInt(b.price || "0") || 0) - (parseInt(a.price || "0") || 0));
    } else if (sortBy === "newest") {
      result = [...result].reverse();
    }

    setFilteredProperties(result);
  }, [search, priceMin, priceMax, bedrooms, bathrooms, homeType, sortBy, allProperties]);

  const saveSearch = () => {
    const newSearch = { search, priceMin, priceMax, bedrooms, bathrooms, homeType };
    const isDuplicate = savedSearches.some(s => 
      s.search === search && s.priceMin === priceMin && s.priceMax === priceMax && s.bedrooms === bedrooms && s.bathrooms === bathrooms && s.homeType === homeType
    );
    
    if (!isDuplicate) {
      const updated = [...savedSearches, newSearch];
      setSavedSearches(updated);
      localStorage.setItem("choiceProperties_savedSearches", JSON.stringify(updated));
      toast.success("Search saved! You can find it in your saved searches.");
    } else {
      toast.info("This search is already saved.");
    }
  };

  const handleCompare = (property: Property) => {
    const isAlreadyInList = comparisonList.some(p => p.id === property.id);
    
    if (isAlreadyInList) {
      setComparisonList(prev => prev.filter(p => p.id !== property.id));
    } else {
      if (comparisonList.length >= 4) {
        toast.warning("You can compare up to 4 properties at a time");
        return;
      }
      setComparisonList(prev => [...prev, property as PropertyWithOwner]);
    }
  };

  const removeFromComparison = (id: string) => {
    setComparisonList(prev => prev.filter(p => p.id !== id));
  };

  const loadSearch = (s: typeof savedSearches[0]) => {
    setSearch(s.search);
    setPriceMin(s.priceMin);
    setPriceMax(s.priceMax);
    setBedrooms(s.bedrooms);
    setBathrooms(s.bathrooms);
    setHomeType(s.homeType);
  };

  const deleteSearch = (index: number) => {
    const updated = savedSearches.filter((_, i) => i !== index);
    setSavedSearches(updated);
    localStorage.setItem("choiceProperties_savedSearches", JSON.stringify(updated));
  };

  const resetFilters = () => {
    setSearch("");
    setPriceMin("0");
    setPriceMax("10000");
    setBedrooms("any");
    setBathrooms("any");
    setHomeType("any");
    setSortBy("featured");
  };

  const handleQuickView = (property: Property) => {
    setQuickViewProperty(property);
    setIsQuickViewOpen(true);
  };

  // Use real map markers with actual property coordinates
  const mapMarkers = filteredProperties
    .filter(p => p.price && p.latitude && p.longitude) // Filter properties with coordinates
    .map((p) => {
      const lat = parseFloat(p.latitude || '34.0522');
      const lng = parseFloat(p.longitude || '-118.2437');
      const priceNum = typeof p.price === 'string' ? parseInt(p.price) : (p.price || 0);
      return {
          position: [lat, lng] as [number, number],
          title: `$${priceNum.toLocaleString()}`,
          description: p.address
      }
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <Breadcrumb items={[{ label: "Properties" }]} />
      
      {savedSearches.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800 px-4 py-2 text-sm">
          <span className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <Bookmark className="h-4 w-4" />
            <strong>{savedSearches.length}</strong> saved search{savedSearches.length !== 1 ? 'es' : ''}
          </span>
        </div>
      )}
      
      {/* Desktop Filter Bar */}
      <div className="hidden md:block border-b bg-white dark:bg-gray-950 shadow-sm p-3 z-20 sticky top-0 transition-all duration-300">
        <div className="container mx-auto max-w-7xl flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full md:w-auto">
                <Input 
                  placeholder="Address, Neighborhood, or Zip" 
                  className="pl-3 pr-10 h-10 border-gray-300 dark:border-gray-700 focus:border-primary dark:bg-gray-800 dark:text-white" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-address"
                />
                <Search className="absolute right-3 top-2.5 h-5 w-5 text-primary dark:text-blue-400 cursor-pointer" />
            </div>

            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">$</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="10000"
                    step="100"
                    value={priceMin} 
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="w-[80px] h-10 px-2 border border-gray-300 dark:border-gray-700 rounded dark:bg-gray-800 dark:text-white text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Min"
                    data-testid="input-price-min"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">to</span>
                  <input 
                    type="number" 
                    min="0" 
                    max="10000"
                    step="100"
                    value={priceMax} 
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="w-[80px] h-10 px-2 border border-gray-300 dark:border-gray-700 rounded dark:bg-gray-800 dark:text-white text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Max"
                    data-testid="input-price-max"
                  />
                </div>

                <Select value={bedrooms} onValueChange={setBedrooms}>
                    <SelectTrigger className={`w-[120px] h-10 border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-all duration-200 ${bedrooms !== 'any' ? 'border-primary dark:border-blue-400 ring-2 ring-primary/20 dark:ring-blue-500/20' : ''}`} data-testid="select-bedrooms">
                        <SelectValue placeholder="Beds" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="any">Any Beds</SelectItem>
                        <SelectItem value="1">1+ Bd</SelectItem>
                        <SelectItem value="2">2+ Bd</SelectItem>
                        <SelectItem value="3">3+ Bd</SelectItem>
                        <SelectItem value="4">4+ Bd</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={bathrooms} onValueChange={setBathrooms}>
                    <SelectTrigger className={`w-[120px] h-10 border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-all duration-200 ${bathrooms !== 'any' ? 'border-primary dark:border-blue-400 ring-2 ring-primary/20 dark:ring-blue-500/20' : ''}`} data-testid="select-bathrooms">
                        <SelectValue placeholder="Baths" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="any">Any Baths</SelectItem>
                        <SelectItem value="1">1+ Ba</SelectItem>
                        <SelectItem value="1.5">1.5+ Ba</SelectItem>
                        <SelectItem value="2">2+ Ba</SelectItem>
                        <SelectItem value="3">3+ Ba</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={homeType} onValueChange={setHomeType}>
                    <SelectTrigger className={`w-[140px] h-10 border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-all duration-200 ${homeType !== 'any' ? 'border-primary dark:border-blue-400 ring-2 ring-primary/20 dark:ring-blue-500/20' : ''}`} data-testid="select-home-type">
                        <SelectValue placeholder="Home Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="any">Any Type</SelectItem>
                        <SelectItem value="House">Houses</SelectItem>
                        <SelectItem value="Apartment">Apartments</SelectItem>
                        <SelectItem value="Condo">Condos</SelectItem>
                        <SelectItem value="Townhome">Townhomes</SelectItem>
                    </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[140px] h-10 border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white" data-testid="select-sort-by">
                        <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="featured">Featured</SelectItem>
                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                        <SelectItem value="newest">Newest</SelectItem>
                    </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  className="h-10 border-primary text-primary hover:bg-primary/5 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950/20 flex items-center gap-2 transition-all duration-200" 
                  onClick={saveSearch}
                  data-testid="button-save-search"
                >
                  <Bookmark className="h-4 w-4" /> Save
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-10 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200" 
                  onClick={resetFilters}
                  data-testid="button-reset-filters"
                >
                  Clear
                </Button>

                {/* View Toggle */}
                <div className="flex border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2.5 transition-colors ${viewMode === "grid" ? "bg-primary text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                    title="Grid View"
                    data-testid="button-grid-view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2.5 transition-colors ${viewMode === "list" ? "bg-primary text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                    title="List View"
                    data-testid="button-list-view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("map")}
                    className={`p-2.5 transition-colors ${viewMode === "map" ? "bg-primary text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                    title="Map View"
                    data-testid="button-map-view"
                  >
                    <Map className="h-4 w-4" />
                  </button>
                </div>
            </div>
        </div>
      </div>

      {/* Mobile Filter Bar with Drawer */}
      <div className="md:hidden border-b bg-white dark:bg-gray-950 shadow-sm p-3 z-20 sticky top-0">
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="flex items-center gap-2"
            data-testid="button-mobile-filters"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <div className="relative flex-1">
            <Input
              placeholder="Address, Zip"
              className="pl-3 pr-10 h-9 border-gray-300 dark:border-gray-700 focus:border-primary dark:bg-gray-800 dark:text-white text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-address-mobile"
            />
            <Search className="absolute right-3 top-2 h-4 w-4 text-primary dark:text-blue-400" />
          </div>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <Drawer open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
          <DrawerContent>
            <DrawerHeader className="border-b">
              <DrawerTitle>Filters</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4 pb-8">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Price Range</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="number" 
                  min="0" 
                  max="10000"
                  step="100"
                  value={priceMin} 
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="flex-1 h-9 px-2 border border-gray-300 dark:border-gray-700 rounded dark:bg-gray-800 dark:text-white text-sm"
                  placeholder="Min ($)"
                  data-testid="input-price-min-mobile"
                />
                <span className="text-gray-500 dark:text-gray-400">to</span>
                <input 
                  type="number" 
                  min="0" 
                  max="10000"
                  step="100"
                  value={priceMax} 
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="flex-1 h-9 px-2 border border-gray-300 dark:border-gray-700 rounded dark:bg-gray-800 dark:text-white text-sm"
                  placeholder="Max ($)"
                  data-testid="input-price-max-mobile"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Bedrooms</label>
              <Select value={bedrooms} onValueChange={setBedrooms}>
                <SelectTrigger className="w-full" data-testid="select-bedrooms-mobile">
                  <SelectValue placeholder="Select bedrooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Beds</SelectItem>
                  <SelectItem value="1">1+ Bd</SelectItem>
                  <SelectItem value="2">2+ Bd</SelectItem>
                  <SelectItem value="3">3+ Bd</SelectItem>
                  <SelectItem value="4">4+ Bd</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Bathrooms</label>
              <Select value={bathrooms} onValueChange={setBathrooms}>
                <SelectTrigger className="w-full" data-testid="select-bathrooms-mobile">
                  <SelectValue placeholder="Select bathrooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Baths</SelectItem>
                  <SelectItem value="1">1+ Ba</SelectItem>
                  <SelectItem value="1.5">1.5+ Ba</SelectItem>
                  <SelectItem value="2">2+ Ba</SelectItem>
                  <SelectItem value="3">3+ Ba</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Home Type</label>
              <Select value={homeType} onValueChange={setHomeType}>
                <SelectTrigger className="w-full" data-testid="select-home-type-mobile">
                  <SelectValue placeholder="Select home type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Type</SelectItem>
                  <SelectItem value="House">Houses</SelectItem>
                  <SelectItem value="Apartment">Apartments</SelectItem>
                  <SelectItem value="Condo">Condos</SelectItem>
                  <SelectItem value="Townhome">Townhomes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full" data-testid="select-sort-by-mobile">
                  <SelectValue placeholder="Select sort option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={resetFilters}
                data-testid="button-reset-filters-mobile"
              >
                Clear All
              </Button>
              <Button
                className="flex-1"
                onClick={saveSearch}
                data-testid="button-save-search-mobile"
              >
                <Bookmark className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Full-Width Grid Layout */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto w-full px-4 py-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Rental Properties Available</h2>
              <p className="text-gray-600 dark:text-gray-400">Browse and apply to homes in your area</p>
            </div>
            <span className="text-gray-600 dark:text-gray-400 text-sm font-semibold bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg" data-testid="text-results-count">{filteredProperties.length} results</span>
          </div>

          {/* Saved Searches */}
          {savedSearches.length > 0 && (
            <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">Saved Searches</p>
              <div className="flex gap-2 flex-wrap">
                {savedSearches.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 text-sm">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{s.search || "All Properties"}</span>
                    <button 
                      onClick={() => loadSearch(s)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold text-xs"
                    >Load</button>
                    <button 
                      onClick={() => deleteSearch(idx)}
                      className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 ml-1"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {loading ? (
            <PropertyCardSkeletonGrid />
          ) : filteredProperties.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredProperties.map((property) => (
                  <PropertyCard 
                    key={property.id} 
                    property={property}
                  />
                ))}
              </div>
            ) : viewMode === "list" ? (
              <div className="space-y-4">
                {filteredProperties.map((property) => (
                  <PropertyListCard 
                    key={property.id} 
                    property={property}
                    onQuickView={handleQuickView}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Map View */}
                <div className="lg:sticky lg:top-20 h-[500px] lg:h-[calc(100vh-200px)]">
                  <MapView 
                    center={mapMarkers.length > 0 ? mapMarkers[0].position : [42.6064, -83.1498]}
                    zoom={12}
                    markers={mapMarkers}
                    className="h-full w-full rounded-xl"
                  />
                </div>
                {/* Property List */}
                <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                  {filteredProperties.slice(0, 20).map((property) => (
                    <PropertyCard 
                      key={property.id} 
                      property={property}
                    />
                  ))}
                </div>
              </div>
            )
          ) : (
            <NoResults onReset={resetFilters} />
          )}

          {/* Footer */}
          <div className="mt-12 text-center text-xs text-gray-400 dark:text-gray-600 py-6 border-t border-gray-200 dark:border-gray-800">
            Choice Properties Inc. | Updated every 5 minutes.
          </div>
        </div>
      </div>

      <PropertyQuickView 
        property={quickViewProperty} 
        isOpen={isQuickViewOpen} 
        onClose={() => setIsQuickViewOpen(false)} 
      />

      {/* Property Comparison Modal */}
      <PropertyComparison
        properties={comparisonList}
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        onRemove={removeFromComparison}
      />

      {/* Floating Comparison Bar */}
      {comparisonList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-2xl z-50 p-4 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-primary">
                <Scale className="h-5 w-5" />
                <span className="font-semibold">{comparisonList.length} properties selected</span>
              </div>
              <div className="hidden md:flex items-center gap-2">
                {comparisonList.map(p => (
                  <div 
                    key={p.id} 
                    className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm"
                  >
                    <span className="truncate max-w-[100px]">{p.title}</span>
                    <button 
                      onClick={() => removeFromComparison(p.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setComparisonList([])}
              >
                Clear All
              </Button>
              <Button 
                size="sm"
                onClick={() => setIsComparisonOpen(true)}
                disabled={comparisonList.length < 2}
              >
                Compare Now
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
