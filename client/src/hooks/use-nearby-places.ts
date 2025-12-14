// Mock data for nearby places - deterministic based on coordinates
const nearbyPlacesMockData = {
  Restaurants: [
    { name: "Chef's Table Bistro", distance: 0.3 },
    { name: "Pacific Poke Bowl", distance: 0.5 },
    { name: "Garden Café", distance: 0.7 },
    { name: "The Italian Kitchen", distance: 0.9 },
    { name: "Spice Route Restaurant", distance: 1.2 },
  ],
  Groceries: [
    { name: "Fresh Market", distance: 0.2 },
    { name: "Whole Foods Market", distance: 0.6 },
    { name: "Local Farmers Market", distance: 1.1 },
    { name: "Corner Grocery Store", distance: 1.4 },
  ],
  Schools: [
    { name: "Lincoln Elementary School", distance: 0.4 },
    { name: "Central High School", distance: 1.2 },
    { name: "Oak Park Middle School", distance: 0.8 },
    { name: "University District School", distance: 2.1 },
  ],
  Transit: [
    { name: "Main Street Bus Stop", distance: 0.1 },
    { name: "Central Station (Metro)", distance: 0.6 },
    { name: "Downtown Transit Hub", distance: 1.0 },
    { name: "Airport Shuttle Stop", distance: 2.5 },
  ],
};

export interface NearbyPlace {
  name: string;
  distance: number;
}

export interface NearbyPlacesData {
  [category: string]: NearbyPlace[];
}

export function useNearbyPlaces(
  latitude?: number | string,
  longitude?: number | string
): NearbyPlacesData {
  // Return mock data - in a real app, this could be based on actual coordinates
  // For now, we return consistent data regardless of coordinates
  if (!latitude || !longitude) {
    return {};
  }

  return nearbyPlacesMockData;
}
