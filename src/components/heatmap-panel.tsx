import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { MapPin, RefreshCw } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface Complaint {
  id: string;
  category: string;
  status: string;
  priority: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
  latitude?: number;
  longitude?: number;
}

interface HeatmapPanelProps {
  complaints: Complaint[];
  expanded?: boolean;
  mapHeight?: number;
  minZoom?: number;
}

// ── Correct Barangay Marulas coordinates (Google Maps centroid) ──────────────
const CENTER: [number, number] = [14.6748, 120.9848];
const BOUNDS: [[number, number], [number, number]] = [
  [14.662, 120.972], // SW
  [14.688, 120.997], // NE
];
const POLYGON_COORDS: [number, number][] = [
  [14.6828, 120.9788],
  [14.6838, 120.9818],
  [14.6835, 120.9855],
  [14.6815, 120.9888],
  [14.6788, 120.9912],
  [14.6755, 120.992],
  [14.672, 120.991],
  [14.6695, 120.9885],
  [14.6675, 120.985],
  [14.6678, 120.9812],
  [14.6695, 120.9782],
  [14.6725, 120.9768],
  [14.6762, 120.9765],
  [14.68, 120.9772],
  [14.6828, 120.9788],
];

const CATEGORY_INTENSITY: Record<string, number> = {
  emergency: 1.0,
  security: 0.9,
  "minor-criminal": 0.85,
  infrastructure: 0.75,
  sanitation: 0.7,
  utilities: 0.65,
  health: 0.65,
  "civil-disputes": 0.6,
  other: 0.5,
};

const ALL_CATEGORIES = [
  "all",
  "infrastructure",
  "sanitation",
  "utilities",
  "security",
  "health",
  "emergency",
  "civil-disputes",
  "minor-criminal",
  "other",
];

const CATEGORY_COLORS: Record<string, string> = {
  emergency: "bg-red-500",
  security: "bg-orange-500",
  "minor-criminal": "bg-orange-400",
  infrastructure: "bg-yellow-500",
  sanitation: "bg-lime-500",
  utilities: "bg-blue-400",
  health: "bg-purple-500",
  "civil-disputes": "bg-pink-500",
  other: "bg-gray-400",
};

function loadLeafletHeat(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).L?.heatLayer) {
      resolve();
      return;
    }
    import("leaflet.heat").then(() => resolve()).catch(() => resolve());
  });
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function parseCoordinatesFromLocation(location: unknown) {
  if (typeof location !== "string") return undefined;
  const match = location.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (!match) return undefined;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat, lng };
}

function getComplaintLatLng(c: Complaint): [number, number] | null {
  let lat = toNumber(c.coordinates?.lat ?? c.latitude);
  let lng = toNumber(c.coordinates?.lng ?? c.longitude);

  if (lat === undefined || lng === undefined) {
    const fromLocation = parseCoordinatesFromLocation(c.location);
    if (fromLocation) {
      lat = lat ?? fromLocation.lat;
      lng = lng ?? fromLocation.lng;
    }
  }

  if (lat === undefined || lng === undefined) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return [lat, lng];
}

export function HeatmapPanel({
  complaints,
  expanded = true,
  mapHeight = 320,
  minZoom = 15,
}: HeatmapPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [mapReady, setMapReady] = useState(false);
  const [pointCount, setPointCount] = useState(0);

  const buildPoints = useCallback(
    (cat: string): [number, number, number][] => {
      return complaints
        .filter((c) => {
          const ll = getComplaintLatLng(c);
          return ll !== null && (cat === "all" || c.category === cat);
        })
        .map((c) => {
          const ll = getComplaintLatLng(c)!;
          return [ll[0], ll[1], CATEGORY_INTENSITY[c.category] ?? 0.5];
        });
    },
    [complaints],
  );

  // Rebuild the heat layer from scratch (more reliable than setLatLngs on
  // leaflet.heat 0.2.0 which sometimes doesn't call redraw automatically)
  const rebuildHeatLayer = useCallback(
    (cat: string) => {
      const L = leafletRef.current;
      const map = mapRef.current;
      if (!L || !map) return;

      const points = buildPoints(cat);
      setPointCount(points.length);

      // Remove old heat layer
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }

      if (typeof (L as any).heatLayer !== "function") {
        return;
      }

      if (points.length === 0) return;

      // Create new heat layer with clearly visible settings
      const heat = (L as any).heatLayer(points, {
        radius: 28,
        blur: 20,
        maxZoom: 19,
        max: 1.0,
        minOpacity: 0.55,
        gradient: {
          0.25: "#3b82f6",
          0.5: "#84cc16",
          0.7: "#eab308",
          0.85: "#f97316",
          1.0: "#ef4444",
        },
      });
      heat.addTo(map);
      heatLayerRef.current = heat;

      // Auto-fly to the bounding box of visible points
      if (cat !== "all" && points.length > 0) {
        const lats = points.map((p: [number, number, number]) => p[0]);
        const lngs = points.map((p: [number, number, number]) => p[1]);
        const sw: [number, number] = [
          Math.min(...lats) - 0.001,
          Math.min(...lngs) - 0.001,
        ];
        const ne: [number, number] = [
          Math.max(...lats) + 0.001,
          Math.max(...lngs) + 0.001,
        ];
        map.fitBounds([sw, ne], { maxZoom: 17, animate: true, duration: 0.6 });
      } else {
        // Zoom out to show all of Marulas
        map.flyTo(CENTER, 15, { animate: true, duration: 0.6 });
      }
    },
    [buildPoints],
  );

  // ── Initialise map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    import("leaflet").then(async (L) => {
      if (mapRef.current) return;
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      // Ensure plugin extends the same Leaflet instance.
      (window as any).L = L;

      // Load heat plugin before storing the reference used later.
      await loadLeafletHeat();

      leafletRef.current = L;

      const map = L.map(mapContainerRef.current!, {
        center: CENTER,
        zoom: 15,
        minZoom,
        maxZoom: 19,
        maxBounds: BOUNDS,
        maxBoundsViscosity: 1.0,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Boundary polygon
      L.polygon(POLYGON_COORDS, {
        color: "#3b82f6",
        weight: 2,
        opacity: 0.7,
        fillColor: "#3b82f6",
        fillOpacity: 0.06,
        dashArray: "5 4",
      })
        .addTo(map)
        .bindTooltip("Barangay Marulas", { direction: "center", sticky: true });

      mapRef.current = map;

      // ── Key fix: Leaflet renders black when the container goes from
      // hidden→visible (e.g. inside a collapsible). invalidateSize() forces
      // it to recalculate tile coverage and fill the container correctly.
      setTimeout(() => map.invalidateSize(), 0);
      setTimeout(() => map.invalidateSize(), 150);
      setTimeout(() => map.invalidateSize(), 400);

      setMapReady(true);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        heatLayerRef.current = null;
        leafletRef.current = null;
        setMapReady(false);
      }
    };
  }, [minZoom]);

  // ── Rebuild heat layer when complaints, map readiness, or filter changes ─────
  useEffect(() => {
    if (mapReady) {
      rebuildHeatLayer(categoryFilter);
    }
  }, [complaints, mapReady, categoryFilter, rebuildHeatLayer]);

  useEffect(() => {
    if (!mapRef.current || !expanded) return;
    const map = mapRef.current;
    const reflow = () => {
      map.invalidateSize();
    };

    setTimeout(reflow, 0);
    setTimeout(reflow, 120);
    setTimeout(reflow, 300);
  }, [expanded, mapReady]);

  const handleCategoryChange = (cat: string) => {
    setCategoryFilter(cat);
    // rebuildHeatLayer fires via the useEffect above
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            Complaint Heatmap
            <Badge variant="outline" className="text-xs font-normal">
              {pointCount} point{pointCount !== 1 ? "s" : ""}
            </Badge>
          </CardTitle>
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {cat === "all" ? (
                "All"
              ) : (
                <span className="flex items-center gap-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${CATEGORY_COLORS[cat] ?? "bg-gray-400"}`}
                  />
                  {cat}
                </span>
              )}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative" style={{ height: mapHeight }}>
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Loading state */}
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
              <div className="text-center space-y-2">
                <RefreshCw className="w-7 h-7 text-primary animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Loading heatmap…
                </p>
              </div>
            </div>
          )}

          {/* Legend */}
          {mapReady && (
            <div className="absolute bottom-2 left-2 right-2 sm:right-auto sm:bottom-3 sm:left-3 z-[1000] bg-background/90 backdrop-blur-sm rounded-md p-2 border border-border shadow text-xs space-y-1 pointer-events-none">
              <p className="font-semibold text-foreground">Density</p>
              <div
                className="w-full sm:w-20 h-2.5 rounded-full"
                style={{
                  background:
                    "linear-gradient(to right,#3b82f6,#84cc16,#eab308,#f97316,#ef4444)",
                }}
              />
              <div className="flex justify-between w-full sm:w-20 text-muted-foreground">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          )}

          {/* No-data overlay */}
          {mapReady && pointCount === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-background/85 rounded-xl px-4 py-3 text-center shadow border border-border">
                <MapPin className="w-6 h-6 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-sm font-medium text-foreground">
                  No location data
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {categoryFilter === "all"
                    ? "Complaints with pinned locations will appear here"
                    : `No "${categoryFilter}" complaints with location data`}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
