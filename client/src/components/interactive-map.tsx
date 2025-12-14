import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { LatLngTuple, Icon, DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, School, ShoppingBag, Train, Trees, Building2, Coffee, Utensils, Dumbbell } from "lucide-react";

interface NearbyPlace {
  name: string;
  distance: number;
}

interface NearbyPlacesData {
  [category: string]: NearbyPlace[];
}

interface InteractiveMapProps {
  center: LatLngTuple;
  title: string;
  address: string;
  nearbyPlaces?: NearbyPlacesData;
  showControls?: boolean;
}

const placeTypeIcons: Record<string, { icon: typeof MapPin; color: string }> = {
  school: { icon: School, color: "#3B82F6" },
  shopping: { icon: ShoppingBag, color: "#10B981" },
  transit: { icon: Train, color: "#8B5CF6" },
  park: { icon: Trees, color: "#22C55E" },
  restaurant: { icon: Utensils, color: "#F59E0B" },
  cafe: { icon: Coffee, color: "#A78BFA" },
  gym: { icon: Dumbbell, color: "#EF4444" },
  default: { icon: Building2, color: "#6B7280" },
};

function getPlaceIcon(type: string) {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes("school") || normalizedType.includes("education")) return placeTypeIcons.school;
  if (normalizedType.includes("shop") || normalizedType.includes("store") || normalizedType.includes("mall")) return placeTypeIcons.shopping;
  if (normalizedType.includes("transit") || normalizedType.includes("station") || normalizedType.includes("bus")) return placeTypeIcons.transit;
  if (normalizedType.includes("park") || normalizedType.includes("garden")) return placeTypeIcons.park;
  if (normalizedType.includes("restaurant") || normalizedType.includes("food")) return placeTypeIcons.restaurant;
  if (normalizedType.includes("cafe") || normalizedType.includes("coffee")) return placeTypeIcons.cafe;
  if (normalizedType.includes("gym") || normalizedType.includes("fitness")) return placeTypeIcons.gym;
  return placeTypeIcons.default;
}

function createCustomIcon(color: string) {
  return new DivIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function MapControls({ onZoomIn, onZoomOut, onReset }: { onZoomIn: () => void; onZoomOut: () => void; onReset: () => void }) {
  return (
    <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1">
      <Button
        size="icon"
        variant="secondary"
        className="h-8 w-8 bg-white dark:bg-gray-800 shadow-md"
        onClick={onZoomIn}
        data-testid="button-map-zoom-in"
      >
        +
      </Button>
      <Button
        size="icon"
        variant="secondary"
        className="h-8 w-8 bg-white dark:bg-gray-800 shadow-md"
        onClick={onZoomOut}
        data-testid="button-map-zoom-out"
      >
        -
      </Button>
      <Button
        size="icon"
        variant="secondary"
        className="h-8 w-8 bg-white dark:bg-gray-800 shadow-md text-xs"
        onClick={onReset}
        data-testid="button-map-reset"
      >
        <MapPin className="h-4 w-4" />
      </Button>
    </div>
  );
}

function MapController({ center }: { center: LatLngTuple }) {
  const map = useMap();
  
  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  const handleReset = () => {
    map.setView(center, 15);
  };

  return <MapControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleReset} />;
}

export function InteractiveMap({ center, title, address, nearbyPlaces = {}, showControls = true }: InteractiveMapProps) {
  const [showNearbyMarkers, setShowNearbyMarkers] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  if (!center || !center[0] || !center[1]) {
    return (
      <div 
        className="w-full h-[400px] rounded-lg bg-muted flex items-center justify-center"
        data-testid="section-map-unavailable"
      >
        <p className="text-muted-foreground text-center">
          Location data unavailable.
        </p>
      </div>
    );
  }

  const generateNearbyCoordinates = (baseCenter: LatLngTuple, index: number): LatLngTuple => {
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    const angle = (angles[index % angles.length] * Math.PI) / 180;
    const distance = 0.002 + (index * 0.0005);
    return [
      baseCenter[0] + distance * Math.cos(angle),
      baseCenter[1] + distance * Math.sin(angle),
    ];
  };

  const allPlaces: { name: string; type: string; distance: string; coords: LatLngTuple }[] = [];
  let idx = 0;
  Object.entries(nearbyPlaces).forEach(([category, places]) => {
    places.forEach((place) => {
      allPlaces.push({
        name: place.name,
        type: category,
        distance: `${place.distance} mi`,
        coords: generateNearbyCoordinates(center, idx),
      });
      idx++;
    });
  });

  const filteredPlaces = selectedFilter 
    ? allPlaces.filter(p => p.type.toLowerCase().includes(selectedFilter.toLowerCase()))
    : allPlaces;

  const filterTypes = ["School", "Shopping", "Transit", "Park", "Restaurant"];

  return (
    <div className="relative w-full rounded-lg overflow-hidden border" data-testid="section-interactive-map">
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 border-b">
        <Button
          variant={showNearbyMarkers ? "default" : "outline"}
          size="sm"
          onClick={() => setShowNearbyMarkers(!showNearbyMarkers)}
          data-testid="button-toggle-nearby"
        >
          <MapPin className="h-3 w-3 mr-1" />
          Nearby Places
        </Button>
        {showNearbyMarkers && (
          <div className="flex flex-wrap gap-1">
            <Badge
              variant={selectedFilter === null ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setSelectedFilter(null)}
            >
              All
            </Badge>
            {filterTypes.map((type) => (
              <Badge
                key={type}
                variant={selectedFilter === type.toLowerCase() ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setSelectedFilter(selectedFilter === type.toLowerCase() ? null : type.toLowerCase())}
              >
                {type}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <MapContainer
        center={center}
        zoom={15}
        style={{ height: "400px", width: "100%" }}
        scrollWheelZoom={true}
        className="map-container z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {showControls && <MapController center={center} />}

        <Circle 
          center={center} 
          radius={500} 
          pathOptions={{ 
            color: "hsl(var(--primary))", 
            fillColor: "hsl(var(--primary))", 
            fillOpacity: 0.1,
            weight: 2
          }} 
        />

        <Marker position={center} data-testid="marker-property">
          <Popup data-testid="popup-property">
            <div className="text-center">
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground">{address}</p>
            </div>
          </Popup>
        </Marker>

        {showNearbyMarkers && filteredPlaces.map((place, idx) => {
          const { color } = getPlaceIcon(place.type);
          return (
            <Marker
              key={idx}
              position={place.coords}
              icon={createCustomIcon(color)}
              data-testid={`marker-nearby-${idx}`}
            >
              <Popup>
                <div>
                  <p className="font-semibold text-sm">{place.name}</p>
                  <p className="text-xs text-muted-foreground">{place.type}</p>
                  <p className="text-xs font-medium text-primary">{place.distance}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {showNearbyMarkers && filteredPlaces.length > 0 && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t">
          <p className="text-xs text-muted-foreground">
            Showing {filteredPlaces.length} nearby {filteredPlaces.length === 1 ? "place" : "places"}
            {selectedFilter && ` in ${selectedFilter}`}
          </p>
        </div>
      )}
    </div>
  );
}
