import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix Leaflet icon issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    title: string;
    description?: string;
  }>;
  className?: string;
}

export default function MapView({ 
  center = [34.0522, -118.2437], // Default to LA
  zoom = 13, 
  markers = [],
  className = "h-[400px] w-full rounded-xl z-0"
}: MapViewProps) {
  
  return (
    <div className={`${className} overflow-hidden shadow-lg border border-border relative z-0`}>
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={false} 
        className="h-full w-full z-0"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker, idx) => (
          <Marker key={idx} position={marker.position}>
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-sm">{marker.title}</h3>
                {marker.description && <p className="text-xs text-muted-foreground">{marker.description}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
