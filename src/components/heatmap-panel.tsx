import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { MapPin, RefreshCw } from "lucide-react";

interface Complaint {
  id: string;
  category: string;
  status: string;
  priority: string;
  coordinates?: { lat: number; lng: number };
  latitude?: number;
  longitude?: number;
}

interface HeatmapPanelProps {
  complaints: Complaint[];
}

// ── Correct Barangay Marulas coordinates (Google Maps centroid) ──────────────
const CENTER: [number, number] = [14.6748, 120.9848];
const BOUNDS: [[number, number], [number, number]] = [
  [14.662, 120.972], // SW
  [14.688, 120.997], // NE
];
const POLYGON_COORDS: [number, number][] = [
  [14.6828, 120.9788], [14.6838, 120.9818], [14.6835, 120.9855],
  [14.6815, 120.9888], [14.6788, 120.9912], [14.6755, 120.9920],
  [14.6720, 120.9910], [14.6695, 120.9885], [14.6675, 120.9850],
  [14.6678, 120.9812], [14.6695, 120.9782], [14.6725, 120.9768],
  [14.6762, 120.9765], [14.6800, 120.9772], [14.6828, 120.9788],
];

const CATEGORY_INTENSITY: Record<string, number> = {
  emergency: 1.0, security: 0.9, "minor-criminal": 0.85,
  infrastructure: 0.75, sanitation: 0.7, utilities: 0.65,
  health: 0.65, "civil-disputes": 0.6, other: 0.5,
};

const ALL_CATEGORIES = [
  "all", "infrastructure", "sanitation", "utilities",
  "security", "health", "emergency", "civil-disputes",
  "minor-criminal", "other",
];

const CATEGORY_COLORS: Record<string, string> = {
  emergency: "bg-red-500", security: "bg-orange-500",
  "minor-criminal": "bg-orange-400", infrastructure: "bg-yellow-500",
  sanitation: "bg-lime-500", utilities: "bg-blue-400",
  health: "bg-purple-500", "civil-disputes": "bg-pink-500", other: "bg-gray-400",
};

function injectLeafletCSS() {
  if (!document.getElementById("leaflet-css")) {
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);
  }
}

function loadLeafletHeat(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).L?.heatLayer) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js";
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

function getComplaintLatLng(c: Complaint): [number, number] | null {
  const lat = c.coordinates?.lat ?? c.latitude;
  const lng = c.coordinates?.lng ?? c.longitude;
  if (lat && lng) return [lat, lng];
  return null;
}

export function HeatmapPanel({ complaints }: HeatmapPanelProps) {
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
          0.50: "#84cc16",
          0.70: "#eab308",
          0.85: "#f97316",
          1.00: "#ef4444",
        },
      });
      heat.addTo(map);
      heatLayerRef.current = heat;

      // Auto-fly to the bounding box of visible points
      if (cat !== "all" && points.length > 0) {
        const lats = points.map((p) => p[0]);
        const lngs = points.map((p) => p[1]);
        const sw: [number, number] = [Math.min(...lats) - 0.001, Math.min(...lngs) - 0.001];
        const ne: [number, number] = [Math.max(...lats) + 0.001, Math.max(...lngs) + 0.001];
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
    injectLeafletCSS();

    import("leaflet").then(async (L) => {
      if (mapRef.current) return;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      leafletRef.current = L;

      const map = L.map(mapContainerRef.current!, {
        center: CENTER,
        zoom: 15,
        minZoom: 14,
        maxZoom: 19,
        maxBounds: BOUNDS,
        maxBoundsViscosity: 1.0,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Boundary polygon
      L.polygon(POLYGON_COORDS, {
        color: "#3b82f6", weight: 2, opacity: 0.7,
        fillColor: "#3b82f6", fillOpacity: 0.06, dashArray: "5 4",
      }).addTo(map).bindTooltip("Barangay Marulas", { direction: "center", sticky: true });

      mapRef.current = map;

      // ── Key fix: Leaflet renders black when the container goes from
      // hidden→visible (e.g. inside a collapsible). invalidateSize() forces
      // it to recalculate tile coverage and fill the container correctly.
      setTimeout(() => map.invalidateSize(), 0);
      setTimeout(() => map.invalidateSize(), 150);
      setTimeout(() => map.invalidateSize(), 400);

      // Load the heat plugin then build initial layer
      await loadLeafletHeat();
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
  }, []);

  // ── Rebuild heat layer when complaints, map readiness, or filter changes ─────
  useEffect(() => {
    if (mapReady) {
      rebuildHeatLayer(categoryFilter);
    }
  }, [complaints, mapReady, categoryFilter, rebuildHeatLayer]);

  const handleCategoryChange = (cat: string) => {
    setCategoryFilter(cat);
    // rebuildHeatLayer fires via the useEffect above
  };

  const withCoords = complaints.filter((c) => getComplaintLatLng(c) !== null);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">

            <Badge variant="outline" className="text-xs font-normal">
              {pointCount} point{pointCount !== 1 ? "s" : ""}
            </Badge>
          </CardTitle>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {withCoords.length}/{complaints.length} have location
          </span>
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${categoryFilter === cat
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                }`}
            >
              {cat === "all" ? (
                "All"
              ) : (
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${CATEGORY_COLORS[cat] ?? "bg-gray-400"}`} />
                  {cat}
                </span>
              )}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative" style={{ height: 320 }}>
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Loading state */}
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
              <div className="text-center space-y-2">
                <RefreshCw className="w-7 h-7 text-primary animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Loading heatmap…</p>
              </div>
            </div>
          )}

          {/* Legend */}
          {mapReady && (
            <div className="absolute bottom-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm rounded-md p-2 border border-border shadow text-xs space-y-1">
              <p className="font-semibold text-foreground">Density</p>
              <div
                className="w-20 h-2.5 rounded-full"
                style={{ background: "linear-gradient(to right,#3b82f6,#84cc16,#eab308,#f97316,#ef4444)" }}
              />
              <div className="flex justify-between w-20 text-muted-foreground">
                <span>Low</span><span>High</span>
              </div>
            </div>
          )}

          {/* No-data overlay */}
          {mapReady && pointCount === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-background/85 rounded-xl px-4 py-3 text-center shadow border border-border">
                <MapPin className="w-6 h-6 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-sm font-medium text-foreground">No location data</p>
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
