import { useState, useMemo, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PropertyCard } from './property-card';
import { EnhancedPropertyCard } from './property-card-enhanced';
import { PropertyListCard } from './property-list-card';
import { ViewToggle, SortSelect } from './dashboard';
import { EmptyState } from './empty-state';
import { cn } from '@/lib/utils';
import {
  Search,
  X,
  Home,
  ChevronDown,
  ChevronUp,
  Heart,
  SlidersHorizontal,
} from 'lucide-react';
import type { Property, PropertyWithOwner } from '@/lib/types';
import { useFavorites } from '@/hooks/use-favorites';

interface FilterState {
  search: string;
  propertyType: string;
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number | null;
  city: string;
}

interface PropertyCollectionProps {
  properties: Property[];
  loading?: boolean;
  title?: string;
  showFilters?: boolean;
  showViewToggle?: boolean;
  showSort?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onQuickView?: (property: Property) => void;
  initialView?: 'grid' | 'list';
  className?: string;
  useEnhancedCards?: boolean;
}

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'bedrooms', label: 'Most Bedrooms' },
];

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'studio', label: 'Studio' },
];

const BEDROOM_OPTIONS = [
  { value: null, label: 'Any' },
  { value: 1, label: '1+' },
  { value: 2, label: '2+' },
  { value: 3, label: '3+' },
  { value: 4, label: '4+' },
];

export const PropertyCollection = memo(function PropertyCollection({
  properties,
  loading = false,
  title,
  showFilters = true,
  showViewToggle = true,
  showSort = true,
  emptyTitle = 'No properties found',
  emptyDescription = 'Try adjusting your filters or search criteria.',
  emptyAction,
  onQuickView,
  initialView = 'grid',
  className,
  useEnhancedCards = false,
}: PropertyCollectionProps) {
  const [view, setView] = useState<'grid' | 'list'>(initialView);
  const [sort, setSort] = useState('latest');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    propertyType: '',
    minPrice: null,
    maxPrice: null,
    bedrooms: null,
    city: '',
  });

  const { favorites } = useFavorites();

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.propertyType) count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.bedrooms) count++;
    if (filters.city) count++;
    return count;
  }, [filters]);

  const filteredAndSortedProperties = useMemo(() => {
    let result = [...properties];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          (p.title ?? '').toLowerCase().includes(searchLower) ||
          (p.address ?? '').toLowerCase().includes(searchLower) ||
          (p.city ?? '').toLowerCase().includes(searchLower) ||
          (p.description ?? '').toLowerCase().includes(searchLower)
      );
    }

    if (filters.propertyType) {
      result = result.filter(
        (p) => p.property_type?.toLowerCase() === filters.propertyType.toLowerCase()
      );
    }

    if (filters.minPrice) {
      result = result.filter((p) => {
        const price = typeof p.price === 'string' ? parseFloat(p.price) : (p.price || 0);
        return price >= (filters.minPrice || 0);
      });
    }

    if (filters.maxPrice) {
      result = result.filter((p) => {
        const price = typeof p.price === 'string' ? parseFloat(p.price) : (p.price || 0);
        return price <= (filters.maxPrice || Infinity);
      });
    }

    if (filters.bedrooms) {
      result = result.filter((p) => (p.bedrooms || 0) >= (filters.bedrooms || 0));
    }

    if (filters.city) {
      result = result.filter((p) =>
        p.city?.toLowerCase().includes(filters.city.toLowerCase())
      );
    }

    const parsePrice = (p: Property): number => {
      if (typeof p.price === 'string') return parseFloat(p.price) || 0;
      return p.price || 0;
    };

    switch (sort) {
      case 'latest':
        result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        break;
      case 'price-low':
        result.sort((a, b) => parsePrice(a) - parsePrice(b));
        break;
      case 'price-high':
        result.sort((a, b) => parsePrice(b) - parsePrice(a));
        break;
      case 'bedrooms':
        result.sort((a, b) => (b.bedrooms || 0) - (a.bedrooms || 0));
        break;
    }

    return result;
  }, [properties, filters, sort]);

  const clearFilters = () => {
    setFilters({
      search: '',
      propertyType: '',
      minPrice: null,
      maxPrice: null,
      bedrooms: null,
      city: '',
    });
  };

  if (loading) {
    return (
      <div className={cn('space-y-6', className)} data-testid="property-collection-loading">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className={cn(
          'gap-6',
          view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
        )}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-[1.6/1]" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)} data-testid="property-collection">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap flex-1">
          {title && <h2 className="text-xl font-semibold">{title}</h2>}
          
          {showFilters && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search properties..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
                data-testid="input-search-properties"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {showFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="gap-2"
              data-testid="button-toggle-filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
              )}
              {showAdvancedFilters ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}

          {showSort && (
            <SortSelect
              value={sort}
              onChange={setSort}
              options={SORT_OPTIONS}
            />
          )}

          {showViewToggle && (
            <ViewToggle view={view} onViewChange={setView} />
          )}
        </div>
      </div>

      {showFilters && showAdvancedFilters && (
        <Card className="p-4" data-testid="advanced-filters-panel">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Property Type</label>
              <select
                value={filters.propertyType}
                onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                data-testid="select-property-type"
              >
                {PROPERTY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Min Price</label>
              <Input
                type="number"
                placeholder="Min"
                value={filters.minPrice || ''}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value ? Number(e.target.value) : null })}
                className="w-32"
                data-testid="input-min-price"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Price</label>
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxPrice || ''}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : null })}
                className="w-32"
                data-testid="input-max-price"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bedrooms</label>
              <select
                value={filters.bedrooms?.toString() || ''}
                onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value ? Number(e.target.value) : null })}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                data-testid="select-bedrooms"
              >
                {BEDROOM_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value?.toString() || ''}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <Input
                placeholder="City..."
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="w-40"
                data-testid="input-city"
              />
            </div>

            {activeFilterCount > 0 && (
              <div className="flex items-end">
                <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span data-testid="text-results-count">
          {filteredAndSortedProperties.length} {filteredAndSortedProperties.length === 1 ? 'property' : 'properties'} found
        </span>
        {favorites.length > 0 && (
          <span className="flex items-center gap-1">
            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
            {favorites.length} saved
          </span>
        )}
      </div>

      {filteredAndSortedProperties.length === 0 ? (
        <EmptyState
          icon={Home}
          title={emptyTitle}
          description={emptyDescription}
        >
          {emptyAction || (
            activeFilterCount > 0 && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )
          )}
        </EmptyState>
      ) : (
        <div
          className={cn(
            'gap-6',
            view === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'flex flex-col'
          )}
          data-testid="property-grid"
        >
          {filteredAndSortedProperties.map((property) => (
            view === 'grid' ? (
              useEnhancedCards ? (
                <EnhancedPropertyCard
                  key={property.id}
                  property={property as PropertyWithOwner}
                  onQuickView={onQuickView}
                />
              ) : (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onQuickView={onQuickView}
                />
              )
            ) : (
              <PropertyListCard
                key={property.id}
                property={property}
                onQuickView={onQuickView}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
});
