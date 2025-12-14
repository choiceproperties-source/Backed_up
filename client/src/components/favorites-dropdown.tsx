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
import propertiesData from "@/data/properties.json";
import type { Property } from "@/lib/types";

export function FavoritesDropdown() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Property[]>([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("choiceProperties_favorites") || "[]");
    setFavoriteIds(saved);
    
    const favProps = (propertiesData as Property[]).filter(p => saved.includes(p.id));
    setFavorites(favProps);
  }, []);

  if (favoriteIds.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Heart className="h-4 w-4 fill-red-500 text-red-500" />
          <span className="text-xs font-bold bg-red-100 text-red-800 px-2 py-1 rounded-full">
            {favoriteIds.length}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Your Favorites ({favoriteIds.length})</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {favorites.length > 0 ? (
          <>
            {favorites.slice(0, 3).map((prop) => (
              <DropdownMenuItem key={prop.id} className="p-0">
                <Link href={`/property/${prop.id}`}>
                  <span className="w-full p-2 hover:bg-gray-100 block cursor-pointer">
                    <p className="font-semibold text-sm truncate">{prop.title}</p>
                    <p className="text-xs text-gray-600">${prop.price.toLocaleString()}/mo</p>
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
            {favoriteIds.length > 3 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-center text-xs text-gray-600">
                  +{favoriteIds.length - 3} more favorites
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
