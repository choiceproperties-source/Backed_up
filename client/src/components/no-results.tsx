import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Search, ArrowRight, MapPin, Filter } from "lucide-react";

interface NoResultsProps {
  onReset?: () => void;
}

export function NoResults({ onReset }: NoResultsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 min-h-96" data-testid="section-no-results">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl scale-150"></div>
        <Search className="h-20 w-20 text-primary dark:text-blue-400 relative z-10 opacity-80" data-testid="icon-no-results" />
      </div>
      
      <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3" data-testid="text-no-results-title">
        No Properties Found
      </h3>
      
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-2">
        We couldn't find any properties matching your search criteria.
      </p>
      <p className="text-gray-500 dark:text-gray-500 text-center max-w-md mb-8 text-sm">
        Try adjusting your filters or browse all available properties to find your perfect home.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-sm mb-8">
        <div className="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <Filter className="h-5 w-5 text-primary dark:text-blue-400 mb-2" />
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Adjust Filters</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">Try different price ranges or property types</p>
        </div>
        <div className="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <MapPin className="h-5 w-5 text-primary dark:text-blue-400 mb-2" />
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Change Location</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">Search in a different city or neighborhood</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap justify-center w-full">
        {onReset && (
          <Button
            variant="outline"
            onClick={onReset}
            className="border-primary text-primary hover:bg-primary/5 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950/20 font-semibold"
            data-testid="button-clear-filters"
          >
            Clear All Filters
          </Button>
        )}
        <Link href="/properties">
          <Button className="bg-primary hover:bg-primary/90 dark:bg-blue-600 dark:hover:bg-blue-700 text-white gap-2 font-semibold" data-testid="button-browse-all">
            Browse All Properties <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-600 mt-8">
        📧 Save a search to get notified when new properties match your criteria
      </p>
    </div>
  );
}
