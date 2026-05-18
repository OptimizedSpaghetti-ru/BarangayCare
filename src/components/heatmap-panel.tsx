import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { MapPin, RefreshCw } from "lucide-react";
import "leaflet/dist/leaflet.css";
import {
  ASSISTANCE_CATEGORIES,
  COMPLAINT_CATEGORIES,
} from "../config/categories";

interface HeatmapRequest {
  id: string;
  ticketId?: string;
  title?: string;
  category: string;
  status: string;
  priority: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
  latitude?: number;
  longitude?: number;
  recordType?: "complaint" | "assistance";
}

interface HeatmapPanelProps {
  requests: HeatmapRequest[];
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

const CATEGORY_OPTIONS = [
  { value: "all", label: "All" },
  ...COMPLAINT_CATEGORIES,
  ...ASSISTANCE_CATEGORIES,
];

const CATEGORY_LABELS = CATEGORY_OPTIONS.reduce<Record<string, string>>(
  (acc, category) => {
    acc[category.value] = category.label;
    return acc;
  },
  {},
);

const CATEGORY_COLOR_PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#38bdf8",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
  "#64748b",
];

const CATEGORY_DOT_COLORS = CATEGORY_OPTIONS.reduce<Record<string, string>>(
  (acc, category, index) => {
    if (category.value === "all") return acc;
    acc[category.value] =
      CATEGORY_COLOR_PALETTE[index % CATEGORY_COLOR_PALETTE.length];
    return acc;
  },
  {},
);

function getReadableTextColor(hexColor: string): "#111827" | "#ffffff" {
  const normalized = hexColor.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.58 ? "#111827" : "#ffffff";
}

function getCategoryButtonStyle(category: string): CSSProperties {
  const color =
    category === "all"
      ? "var(--primary)"
      : CATEGORY_DOT_COLORS[category] ?? "#64748b";
  const foreground =
    category === "all"
      ? "var(--primary-foreground)"
      : getReadableTextColor(color);

  return {
    "--heatmap-category-color": color,
    "--heatmap-category-foreground": foreground,
  } as CSSProperties;
}

const CATEGORY_INTENSITY = CATEGORY_OPTIONS.reduce<Record<string, number>>(
  (acc, category, index) => {
    if (category.value === "all") return acc;
    const intensity = 0.6 + (index % 5) * 0.08;
    acc[category.value] = Math.min(intensity, 0.98);
    return acc;
  },
  {},
);

const POINTS_PANE = "complaint-points-pane";

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

function isValidCoordinatePair(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function toCoordinatePair(lat: unknown, lng: unknown) {
  const parsedLat = toNumber(lat);
  const parsedLng = toNumber(lng);
  if (parsedLat === undefined || parsedLng === undefined) return undefined;
  if (!isValidCoordinatePair(parsedLat, parsedLng)) return undefined;
  return { lat: parsedLat, lng: parsedLng };
}

function extractCoordinates(
  source: unknown,
): { lat: number; lng: number } | null {
  if (source == null) return null;

  if (typeof source === "object") {
    const obj = source as Record<string, unknown>;

    const direct = toCoordinatePair(
      obj.lat ?? obj.latitude,
      obj.lng ?? obj.longitude ?? obj.lon ?? obj.long,
    );
    if (direct) return direct;

    if (obj.coordinates !== undefined) {
      const nested = extractCoordinates(obj.coordinates);
      if (nested) return nested;
    }

    if (obj.location !== undefined) {
      const fromLocation = extractCoordinates(obj.location);
      if (fromLocation) return fromLocation;
    }

    return null;
  }

  if (typeof source !== "string") return null;

  const value = source.trim();
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    const fromJson = extractCoordinates(parsed);
    if (fromJson) return fromJson;
  } catch {
    // Not JSON; continue with regex parsing.
  }

  const labeledLat = value.match(
    /(?:^|[\s,{])(?:lat|latitude)\s*[:=]\s*(-?\d{1,2}\.\d{3,})/i,
  )?.[1];
  const labeledLng = value.match(
    /(?:^|[\s,{])(?:lng|lon|long|longitude)\s*[:=]\s*(-?\d{1,3}\.\d{3,})/i,
  )?.[1];
  const labeledPair = toCoordinatePair(labeledLat, labeledLng);
  if (labeledPair) return labeledPair;

  const pair = value.match(/(-?\d{1,2}\.\d{3,})\s*[, ]\s*(-?\d{1,3}\.\d{3,})/);
  if (!pair) return null;

  return toCoordinatePair(pair[1], pair[2]) ?? null;
}

function getRequestLatLng(request: HeatmapRequest): [number, number] | null {
  const extracted = extractCoordinates({
    latitude: request.latitude,
    longitude: request.longitude,
    coordinates: request.coordinates,
    location: request.location,
  });

  if (!extracted) return null;
  return [extracted.lat, extracted.lng];
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type HeatPoint = {
  lat: number;
  lng: number;
  intensity: number;
  category: string;
  ticketId?: string;
  title?: string;
  status: string;
  priority: string;
  location?: string;
  recordType?: "complaint" | "assistance";
};

export function HeatmapPanel({
  requests,
  expanded = true,
  mapHeight = 320,
  minZoom = 15,
}: HeatmapPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const pointLayerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [mapReady, setMapReady] = useState(false);
  const [pointCount, setPointCount] = useState(0);

  const visibleCategories = useMemo(() => CATEGORY_OPTIONS, []);

  const buildPoints = useCallback(
    (cat: string): HeatPoint[] => {
      return requests
        .filter((request) => {
          const ll = getRequestLatLng(request);
          return ll !== null && (cat === "all" || request.category === cat);
        })
        .map((request) => {
          const ll = getRequestLatLng(request)!;
          return {
            lat: ll[0],
            lng: ll[1],
            intensity: CATEGORY_INTENSITY[request.category] ?? 0.5,
            category: request.category,
            ticketId: request.ticketId,
            title: request.title,
            status: request.status,
            priority: request.priority,
            location: request.location,
            recordType: request.recordType,
          };
        });
    },
    [requests],
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

      // Remove old point layer
      if (pointLayerRef.current) {
        map.removeLayer(pointLayerRef.current);
        pointLayerRef.current = null;
      }

      if (points.length === 0) return;

      if (typeof (L as any).heatLayer !== "function") {
        console.warn(
          "leaflet.heat plugin unavailable; rendering point dots only",
        );
      } else {
        const heatInput = points.map((point) => [
          point.lat,
          point.lng,
          point.intensity,
        ]);

        // Create new heat layer with clearly visible settings
        const heat = (L as any).heatLayer(heatInput, {
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
      }

      // Always render explicit dots so points are visible even when leaflet.heat
      // fails to attach in some production bundles.
      const pointLayer = L.layerGroup();
      for (const point of points) {
        const dotColor = CATEGORY_DOT_COLORS[point.category] ?? "#64748b";
        const radius = 5 + point.intensity * 5;

        const marker = L.circleMarker([point.lat, point.lng], {
          pane: POINTS_PANE,
          radius,
          color: "#0f172a",
          weight: 1.25,
          fillColor: dotColor,
          fillOpacity: 0.95,
          opacity: 1,
        });

        marker.bindPopup(`
          <div style="font-size:12px;line-height:1.45">
            <strong>Ticket ID: ${escapeHtml(point.ticketId || "Pending")}</strong><br/>
            ${point.title ? `${escapeHtml(point.title)}<br/>` : ""}
            Type: ${point.recordType === "assistance" ? "Assistance" : "Complaint"}<br/>
            Category: ${escapeHtml(CATEGORY_LABELS[point.category] ?? point.category)}<br/>
            Status: ${escapeHtml(point.status)}<br/>
            Priority: ${escapeHtml(point.priority)}
            ${point.location ? `<br/>Location: ${escapeHtml(point.location)}` : ""}
          </div>
        `);
        marker.addTo(pointLayer);
      }
      pointLayer.addTo(map);
      pointLayerRef.current = pointLayer;

      // Auto-fly to the bounding box of visible points
      if (cat !== "all" && points.length > 0) {
        const lats = points.map((p) => p.lat);
        const lngs = points.map((p) => p.lng);
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

      const pane = map.getPane(POINTS_PANE) ?? map.createPane(POINTS_PANE);
      pane.style.zIndex = "650";
      pane.style.pointerEvents = "auto";

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
        pointLayerRef.current = null;
        leafletRef.current = null;
        setMapReady(false);
      }
    };
  }, [minZoom]);

  // ── Rebuild heat layer when requests, map readiness, or filter changes ─────
  useEffect(() => {
    if (mapReady) {
      rebuildHeatLayer(categoryFilter);
    }
  }, [requests, mapReady, categoryFilter, rebuildHeatLayer]);

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
            Complaint and Assistance Heatmap
            <Badge variant="outline" className="text-xs font-normal">
              {pointCount} point{pointCount !== 1 ? "s" : ""}
            </Badge>
          </CardTitle>
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {visibleCategories.map((cat) => {
            const isSelected = categoryFilter === cat.value;

            return (
              <button
                key={cat.value}
                type="button"
                aria-pressed={isSelected}
                data-selected={isSelected}
                onClick={() => handleCategoryChange(cat.value)}
                className="heatmap-category-filter rounded-full border px-2.5 py-1 text-xs font-medium transition-all"
                style={getCategoryButtonStyle(cat.value)}
              >
                {cat.value === "all" ? (
                  cat.label
                ) : (
                  <span className="flex items-center gap-1">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          CATEGORY_DOT_COLORS[cat.value] ?? "#9ca3af",
                      }}
                    />
                    <span>{cat.label}</span>
                  </span>
                )}
              </button>
            );
          })}
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
                    ? "Requests with pinned locations will appear here"
                    : `No "${CATEGORY_LABELS[categoryFilter] ?? categoryFilter}" requests with location data`}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
