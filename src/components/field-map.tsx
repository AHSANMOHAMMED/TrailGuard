import { useEffect, useMemo, useRef, useState } from "react";
import { useField } from "@/lib/store";
import { RISK_ZONE_PATH, YALA_BOUNDS, YALA_ROUTE } from "@/lib/domain/yala-route";
import { cn } from "@/lib/utils";

type LatLng = { lat: number; lng: number };

export type FieldMapMode = "patrol" | "pin" | "risk";

type FieldMapProps = {
  mode: FieldMapMode;
  height?: number;
  /** 0..1 progress along NB-03 (patrol). */
  progress?: number;
  covered?: boolean;
  showWaypoint?: boolean;
  /** Pin position (incident/conflict). */
  pin?: LatLng;
  pinLabel?: string;
  caption?: string;
  /** Risk approach 0..1 (alerts). */
  approach?: number;
  resolvedInside?: boolean;
  className?: string;
};

function mapsKey(): string | undefined {
  const k = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  return k && k.trim() ? k.trim() : undefined;
}

/**
 * Dual map: Google Maps when online + API key; OfflineFieldMap otherwise.
 * Same overlays (track / pin / risk) so UCs never see a blank map offline.
 */
export function FieldMap(props: FieldMapProps) {
  const online = useField((s) => s.online);
  const key = mapsKey();
  const useGoogle = online && Boolean(key);

  // Prefer the A01 wireframe OfflineFieldMap look (PDF Figures 6/10/14/18).
  // Google tiles only when online + key — no branding caption under the map.
  return (
    <div className={cn("w-full", props.className)}>
      {useGoogle ? <GoogleFieldMap {...props} apiKey={key!} /> : <OfflineFieldMap {...props} />}
    </div>
  );
}

/** Project lat/lng into a 358×H SVG viewBox over Yala bounds. */
function project(p: LatLng, h: number): { x: number; y: number } {
  const { south, west, north, east } = YALA_BOUNDS;
  const x = ((p.lng - west) / (east - west)) * 358;
  const y = ((north - p.lat) / (north - south)) * h;
  return { x, y };
}

export function OfflineFieldMap({
  mode,
  height = 210,
  progress = 0,
  covered = false,
  showWaypoint = false,
  pin,
  pinLabel = "Location",
  caption,
  approach = 0,
  resolvedInside = false,
}: FieldMapProps) {
  const h = height;
  const start = project(YALA_ROUTE.start, h);
  const end = project(YALA_ROUTE.end, h);
  const t = covered ? 1 : Math.max(0, Math.min(1, progress));
  const you = project(
    {
      lat: YALA_ROUTE.start.lat + (YALA_ROUTE.end.lat - YALA_ROUTE.start.lat) * t,
      lng: YALA_ROUTE.start.lng + (YALA_ROUTE.end.lng - YALA_ROUTE.start.lng) * t,
    },
    h,
  );
  const pinPt = project(pin ?? { lat: 6.408, lng: 81.121 }, h);
  const riskPts = RISK_ZONE_PATH.map((p) => project(p, h));
  const riskD = riskPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ") + " Z";
  const animal = resolvedInside
    ? project({ lat: 6.42, lng: 81.148 }, h)
    : project({ lat: 6.435, lng: 81.152 }, h);
  const youRisk = project(
    {
      lat: 6.4 + approach * 0.03,
      lng: 81.12 + approach * 0.03,
    },
    h,
  );

  return (
    <div>
      <svg
        viewBox={`0 0 358 ${h}`}
        style={{ height: h }}
        className="w-full rounded-xl border border-border"
        role="img"
        aria-label={
          mode === "patrol" ? "Offline patrol map" : mode === "risk" ? "Offline risk map" : "Offline pin map"
        }
      >
        <defs>
          <linearGradient id="yalaTerrain" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#dce8d6" />
            <stop offset="55%" stopColor="#e9efe4" />
            <stop offset="100%" stopColor="#cfdcc8" />
          </linearGradient>
          <pattern id="offlineHatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="7" stroke="#b3261e" strokeWidth="1.4" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="358" height={h} fill="url(#yalaTerrain)" rx="12" />
        {/* Park scrub */}
        <ellipse cx="90" cy={h * 0.35} rx="48" ry="22" fill="#b9cbb0" opacity="0.55" />
        <ellipse cx="260" cy={h * 0.55} rx="60" ry="28" fill="#b9cbb0" opacity="0.45" />
        <text x="12" y="18" fontSize="9" fontWeight="700" fill="#3b7a57" letterSpacing="0.4">
          YALA · OFFLINE BASEMAP
        </text>

        {(mode === "patrol" || mode === "pin") && (
          <>
            <path
              d={`M${start.x} ${start.y} L${end.x} ${end.y}`}
              fill="none"
              stroke="#5c7265"
              strokeWidth="2"
              strokeDasharray="6 5"
              opacity="0.75"
            />
            <circle cx={start.x} cy={start.y} r="5" fill="#f6f8f5" stroke="#1f5a43" strokeWidth="2" />
            <text x={start.x + 8} y={start.y + 4} fontSize="9" fontWeight="700" fill="#1f5a43">
              START
            </text>
            <circle
              cx={end.x}
              cy={end.y}
              r="5"
              fill={covered ? "#1f5a43" : "#f6f8f5"}
              stroke="#1f5a43"
              strokeWidth="2"
            />
            <text x={end.x - 28} y={end.y - 10} fontSize="9" fontWeight="700" fill="#1f5a43">
              END
            </text>
          </>
        )}

        {mode === "patrol" && t > 0 && (
          <>
            <line
              x1={start.x}
              y1={start.y}
              x2={you.x}
              y2={you.y}
              stroke="#1f5a43"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle cx={you.x} cy={you.y} r="9" fill="#1f5a43" opacity="0.18" />
            <circle cx={you.x} cy={you.y} r="4.5" fill="#1f5a43" stroke="#fff" strokeWidth="2" />
            {showWaypoint ? (
              <path
                d={`M${you.x} ${you.y - 22} c -7 0 -11 5 -11 11 0 8 11 18 11 18 s 11 -10 11 -18 c 0 -6 -4 -11 -11 -11 Z`}
                fill="#1f5a43"
                stroke="#fff"
                strokeWidth="1.5"
              />
            ) : null}
          </>
        )}

        {mode === "pin" && (
          <>
            <path
              d={`M${pinPt.x} ${pinPt.y - 22} c -7 0 -11 5 -11 11 0 8 11 18 11 18 s 11 -10 11 -18 c 0 -6 -4 -11 -11 -11 Z`}
              fill="#b3261e"
              stroke="#fff"
              strokeWidth="1.5"
            />
            <circle cx={pinPt.x} cy={pinPt.y} r="3" fill="#fff" />
            <text x={Math.min(pinPt.x + 10, 250)} y={pinPt.y - 8} fontSize="9" fontWeight="700" fill="#b3261e">
              {pinLabel}
            </text>
            {caption ? (
              <text x="14" y={h - 12} fontSize="10" fill="#5f7366">
                {caption}
              </text>
            ) : null}
          </>
        )}

        {mode === "risk" && (
          <>
            <path d={riskD} fill="url(#offlineHatch)" stroke="#b3261e" strokeWidth="1.8" strokeDasharray="6 4" />
            <text x={riskPts[0].x + 6} y={riskPts[0].y + 14} fontSize="8" fontWeight="700" fill="#b3261e">
              HIGH-RISK ZONE
            </text>
            <circle cx={animal.x} cy={animal.y} r="11" fill="none" stroke="#b3261e" strokeWidth="2.5" />
            <circle cx={animal.x} cy={animal.y} r="4" fill="#b3261e" />
            <text x={animal.x + 14} y={animal.y + 4} fontSize="9" fontWeight="700" fill="#b3261e">
              EL-07
            </text>
            <circle cx={youRisk.x} cy={youRisk.y} r="9" fill="#1f5a43" opacity="0.18" />
            <circle cx={youRisk.x} cy={youRisk.y} r="4.5" fill="#1f5a43" stroke="#fff" strokeWidth="2" />
            <text x={youRisk.x - 10} y={youRisk.y + 18} fontSize="9" fontWeight="700" fill="#1f5a43">
              You
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (
          el: HTMLElement,
          opts: Record<string, unknown>,
        ) => {
          setCenter: (c: LatLng) => void;
          fitBounds?: (b: unknown) => void;
        };
        Polyline: new (opts: Record<string, unknown>) => unknown;
        Marker: new (opts: Record<string, unknown>) => unknown;
        Polygon: new (opts: Record<string, unknown>) => unknown;
        LatLngBounds: new () => { extend: (p: LatLng) => void };
      };
    };
    __tgMapsCb?: () => void;
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.google?.maps) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-tg-gmaps]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("gmaps load")));
      return;
    }
    window.__tgMapsCb = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=__tgMapsCb`;
    s.async = true;
    s.defer = true;
    s.dataset.tgGmaps = "1";
    s.onerror = () => reject(new Error("gmaps load"));
    document.head.appendChild(s);
  });
}

function GoogleFieldMap(props: FieldMapProps & { apiKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const h = props.height ?? 210;

  const path = useMemo(() => [YALA_ROUTE.start, YALA_ROUTE.end], []);
  const t = props.covered ? 1 : Math.max(0, Math.min(1, props.progress ?? 0));
  const you: LatLng = {
    lat: YALA_ROUTE.start.lat + (YALA_ROUTE.end.lat - YALA_ROUTE.start.lat) * t,
    lng: YALA_ROUTE.start.lng + (YALA_ROUTE.end.lng - YALA_ROUTE.start.lng) * t,
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadGoogleMaps(props.apiKey);
        if (cancelled || !ref.current || !window.google?.maps) return;
        const map = new window.google.maps.Map(ref.current, {
          center: YALA_BOUNDS.center,
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        new window.google.maps.Polyline({
          path,
          map,
          strokeColor: "#5c7265",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "12px" }],
        });
        if (props.mode === "patrol" && t > 0) {
          new window.google.maps.Polyline({
            path: [YALA_ROUTE.start, you],
            map,
            strokeColor: "#1f5a43",
            strokeWeight: 4,
          });
          new window.google.maps.Marker({
            position: you,
            map,
            title: "You",
          });
        }
        if (props.mode === "pin") {
          const p = props.pin ?? { lat: 6.408, lng: 81.121 };
          new window.google.maps.Marker({
            position: p,
            map,
            title: props.pinLabel ?? "Location",
          });
          map.setCenter(p);
        }
        if (props.mode === "risk") {
          new window.google.maps.Polygon({
            paths: RISK_ZONE_PATH,
            map,
            fillColor: "#b3261e",
            fillOpacity: 0.25,
            strokeColor: "#b3261e",
            strokeWeight: 2,
          });
          const approach = props.approach ?? 0;
          new window.google.maps.Marker({
            position: props.resolvedInside
              ? { lat: 6.42, lng: 81.148 }
              : { lat: 6.435, lng: 81.152 },
            map,
            title: "EL-07",
          });
          new window.google.maps.Marker({
            position: { lat: 6.4 + approach * 0.03, lng: 81.12 + approach * 0.03 },
            map,
            title: "You",
          });
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.apiKey, props.mode, props.progress, props.covered, props.approach, props.resolvedInside, props.pin, t, you.lat, you.lng, path, h]);

  if (failed) return <OfflineFieldMap {...props} />;

  return <div ref={ref} style={{ height: h }} className="w-full overflow-hidden rounded-xl border border-border" />;
}

/** Back-compat aliases used by routes during migration. */
export function RouteMap(props: {
  progress?: number;
  covered?: boolean;
  height?: number;
  waypoint?: boolean;
}) {
  return (
    <FieldMap
      mode="patrol"
      progress={props.progress}
      covered={props.covered}
      height={props.height}
      showWaypoint={props.waypoint}
    />
  );
}

export function PinMap(props: {
  caption?: string;
  height?: number;
  pinLabel?: string;
  pin?: LatLng;
}) {
  return (
    <FieldMap
      mode="pin"
      height={props.height}
      caption={props.caption}
      pinLabel={props.pinLabel}
      pin={props.pin}
    />
  );
}

export function RiskMap(props: {
  approach?: number;
  resolvedInside?: boolean;
  height?: number;
}) {
  return (
    <FieldMap
      mode="risk"
      approach={props.approach}
      resolvedInside={props.resolvedInside}
      height={props.height}
    />
  );
}
