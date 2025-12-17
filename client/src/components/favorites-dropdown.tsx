import { useState, useEffect } from "react";
import { Heart, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { getFavoritesWithProperties } from "@/lib/supabase-service";

interface FavoriteProperty {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  price: number | null;
}

export function FavoritesDropdown() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }

    const fetchFavorites = async () => {
      setLoading(true);
      try {
        const data = await getFavoritesWithProperties(user.id);
        const props = data
          .map((f: any) => f.properties)
          .filter((p: any): p is FavoriteProperty => p !== null);
        setFavorites(props);
      } catch (err) {
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  // Render nothing if no user or no favorites, but hooks are already called above
  if (!user || favorites.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" data-testid="button-favorites-dropdown">
          <Heart className="h-4 w-4 fill-red-500 text-red-500" />
          <span className="text-xs font-bold bg-red-100 text-red-800 px-2 py-1 rounded-full dark:bg-red-900 dark:text-red-200">
            {favorites.length}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Your Favorites ({favorites.length})</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
        ) : favorites.length > 0 ? (
          <>
            {favorites.slice(0, 3).map((prop) => (
              <DropdownMenuItem key={prop.id} className="p-0" data-testid={`menu-item-favorite-${prop.id}`}>
                <Link href={`/property/${prop.id}`}>
                  <span className="w-full p-2 hover-elevate block cursor-pointer">
                    <p className="font-semibold text-sm truncate">{prop.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {prop.price ? `$${prop.price.toLocaleString()}/mo` : 'Price TBD'}
                    </p>
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
            {favorites.length > 3 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-center text-xs text-muted-foreground">
                  +{favorites.length - 3} more favorites
                </DropdownMenuItem>
              </>
            )}
          </>
        ) : (
          <DropdownMenuItem disabled>No favorites yet</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
