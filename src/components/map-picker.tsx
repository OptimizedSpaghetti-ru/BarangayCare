import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { MapPin, Navigation, AlertTriangle } from "lucide-react";

interface LatLng {
  lat: number;
  lng: number;
}

interface LocationResult {
  lat: number;
  lng: number;
  address: string;
}

interface MapPickerProps {
  initialCoordinates?: LatLng | null;
  onLocationSelect: (location: LocationResult) => void;
  onClose?: () => void;
}

// ── Barangay Marulas, Valenzuela City boundary polygon (GeoJSON coords) ────────
// Source: Google Maps place centroid — 14.6748398, 120.9847642
// View center from URL: @14.6763762, 120.9794716, 15.5z
const MARULAS_CENTER: LatLng = { lat: 14.6748, lng: 120.9848 };

// Pan/zoom lock bounding box — keeps map restricted to Marulas area
const MARULAS_BOUNDS: [[number, number], [number, number]] = [
  [14.662, 120.972], // SW corner
  [14.688, 120.997], // NE corner
];

// Approximate boundary polygon for Barangay Marulas
// Traced around the known geographic extent from Google Maps
const MARULAS_POLYGON_COORDS: [number, number][] = [
  [14.6828, 120.9788], // NW
  [14.6838, 120.9818], // N
  [14.6835, 120.9855], // NE
  [14.6815, 120.9888], // E-NE
  [14.6788, 120.9912], // E
  [14.6755, 120.9920], // SE
  [14.6720, 120.9910], // S-SE
  [14.6695, 120.9885], // S
  [14.6675, 120.9850], // SW
  [14.6678, 120.9812], // W
  [14.6695, 120.9782], // W-NW
  [14.6725, 120.9768], // NW
  [14.6762, 120.9765], // N-NW
  [14.6800, 120.9772], // N
  [14.6828, 120.9788], // close
];

// Point-in-polygon check (ray casting algorithm)
function isInsidePolygon(point: LatLng, polygon: [number, number][]): boolean {
  const { lat, lng } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function MapPicker({ initialCoordinates, onLocationSelect, onClose }: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [selectedCoords, setSelectedCoords] = useState<LatLng | null>(
    initialCoordinates || null,
  );
  const [outsideWarning, setOutsideWarning] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [address, setAddress] = useState<string>("");
  const [mapReady, setMapReady] = useState(false);

  // Reverse geocode using Nominatim (no API key required)
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      setGeocoding(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lng=${lng}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "en" } },
      );
      if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      const data = await res.json();
      // Build a short address string from the response
      const a = data.address || {};
      const parts = [
        a.road || a.pedestrian || a.path || "",
        a.suburb || a.neighbourhood || a.quarter || "",
        a.city || a.town || a.village || "Valenzuela City",
      ].filter(Boolean);
      return parts.join(", ") || data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } finally {
      setGeocoding(false);
    }
  };

  const placeMarker = async (L: any, lat: number, lng: number, isInitial = false) => {
    const inside = isInsidePolygon({ lat, lng }, MARULAS_POLYGON_COORDS);

    if (!inside && !isInitial) {
      setOutsideWarning(true);
      setTimeout(() => setOutsideWarning(false), 4000);
      return;
    }

    // Use center if initial coords are outside boundary
    const finalLat = (!inside && isInitial) ? MARULAS_CENTER.lat : lat;
    const finalLng = (!inside && isInitial) ? MARULAS_CENTER.lng : lng;

    setOutsideWarning(false);

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Custom red pin icon
    const icon = L.divIcon({
      html: `<div style="width:28px;height:36px;position:relative;">
        <svg viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="#ef4444"/>
          <circle cx="14" cy="14" r="6" fill="white"/>
        </svg>
      </div>`,
      className: "",
      iconSize: [28, 36],
      iconAnchor: [14, 36],
      popupAnchor: [0, -36],
    });

    const marker = L.marker([finalLat, finalLng], {
      icon,
      draggable: true,
    }).addTo(mapRef.current);

    marker.on("dragend", async (e: any) => {
      const pos = e.target.getLatLng();
      const insideDrag = isInsidePolygon(
        { lat: pos.lat, lng: pos.lng },
        MARULAS_POLYGON_COORDS,
      );
      if (!insideDrag) {
        marker.setLatLng([finalLat, finalLng]);
        setOutsideWarning(true);
        setTimeout(() => setOutsideWarning(false), 4000);
      } else {
        const addr = await reverseGeocode(pos.lat, pos.lng);
        setSelectedCoords({ lat: pos.lat, lng: pos.lng });
        setAddress(addr);
      }
    });

    markerRef.current = marker;
    const addr = await reverseGeocode(finalLat, finalLng);
    setSelectedCoords({ lat: finalLat, lng: finalLng });
    setAddress(addr);
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Dynamically import leaflet (avoids any SSR issues)
    import("leaflet").then((L) => {
      // Avoid double-init in strict mode
      if (mapRef.current) return;

      // Fix default icon paths broken by Vite
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapContainerRef.current!, {
        center: [MARULAS_CENTER.lat, MARULAS_CENTER.lng],
        zoom: 16,
        minZoom: 15,
        maxZoom: 19,
        maxBounds: MARULAS_BOUNDS,
        maxBoundsViscosity: 1.0,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Draw barangay boundary polygon
      const polygonLatLngs = MARULAS_POLYGON_COORDS.map(([lat, lng]) => [lat, lng] as [number, number]);
      L.polygon(polygonLatLngs, {
        color: "#3b82f6",
        weight: 2.5,
        opacity: 0.8,
        fillColor: "#3b82f6",
        fillOpacity: 0.07,
        dashArray: "6 4",
      }).addTo(map).bindTooltip("Barangay Marulas, Valenzuela City", {
        permanent: false,
        direction: "center",
        className: "text-xs font-medium",
      });

      // Place initial marker if coordinates provided
      if (initialCoordinates) {
        placeMarker(L, initialCoordinates.lat, initialCoordinates.lng, true);
      }

      // Click handler
      map.on("click", (e: any) => {
        placeMarker(L, e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  const handleConfirm = () => {
    if (!selectedCoords) return;
    onLocationSelect({
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
      address,
    });
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        import("leaflet").then((L) => {
          const inside = isInsidePolygon({ lat, lng }, MARULAS_POLYGON_COORDS);
          if (inside) {
            mapRef.current.setView([lat, lng], 18);
            placeMarker(L, lat, lng);
          } else {
            setOutsideWarning(true);
            setTimeout(() => setOutsideWarning(false), 4000);
          }
        });
      },
      () => {
        setOutsideWarning(true);
        setTimeout(() => setOutsideWarning(false), 3000);
      },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Map */}
      <div className="relative rounded-lg overflow-hidden border" style={{ height: 380 }}>
        {/* Leaflet CSS — loaded once per page */}
        {!document.getElementById("leaflet-css") && (() => {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
          document.head.appendChild(link);
          return null;
        })()}

        <div ref={mapContainerRef} className="w-full h-full" />

        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Loading map…</p>
            </div>
          </div>
        )}

        {/* My Location button */}
        <button
          type="button"
          onClick={handleMyLocation}
          className="absolute top-3 right-3 z-[1000] bg-white dark:bg-gray-800 shadow-md rounded-md p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-border"
          title="Use my current location"
        >
          <Navigation className="w-4 h-4 text-primary" />
        </button>

        {/* Instruction banner */}
        <div className="absolute bottom-3 left-3 right-12 z-[1000]">
          <div className="bg-background/90 backdrop-blur-sm rounded-md px-3 py-2 text-xs text-muted-foreground text-center border border-border shadow-sm">
            {selectedCoords
              ? geocoding
                ? "Getting address…"
                : `📍 ${address || `${selectedCoords.lat.toFixed(5)}, ${selectedCoords.lng.toFixed(5)}`}`
              : "Click inside the blue boundary to pin your location"}
          </div>
        </div>
      </div>

      {/* Outside boundary warning */}
      {outsideWarning && (
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 py-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
            That location is <strong>outside Barangay Marulas</strong>. Please pin a location within the blue boundary.
          </AlertDescription>
        </Alert>
      )}

      {/* Coordinates readout */}
      {selectedCoords && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 shrink-0 text-primary" />
          <span>
            Lat: <strong>{selectedCoords.lat.toFixed(6)}</strong> &nbsp; Lng:{" "}
            <strong>{selectedCoords.lng.toFixed(6)}</strong>
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedCoords || geocoding}
          className="flex items-center gap-2"
        >
          <MapPin className="w-4 h-4" />
          {geocoding ? "Getting address…" : "Confirm Location"}
        </Button>
      </div>
    </div>
  );
}
