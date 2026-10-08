import type { ReactNode, SVGProps } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Check, ChevronLeft, CloudOff, LocateFixed, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Mobile field kit matching the A01 high-fidelity wireframes
 * (Ranger field application · mobile 390×844).
 */

export function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-[#e6ece5] md:py-8">
      <div className="relative flex w-full max-w-[390px] flex-col bg-bg shadow-sm md:min-h-[844px] md:rounded-[30px] md:border md:border-[#cfd9cf] md:shadow-xl md:overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export function ScreenHeader({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack?: (() => void) | "home";
  children?: ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="flex items-center gap-1 px-3 pb-2 pt-4">
      {onBack ? (
        <button
          type="button"
          aria-label="Back"
          onClick={() => (onBack === "home" ? router.navigate({ to: "/" }) : onBack())}
          className="flex size-10 items-center justify-center rounded-full text-fg hover:bg-elevated"
        >
          <ChevronLeft className="size-5" strokeWidth={2.25} />
        </button>
      ) : (
        <span className="w-2" />
      )}
      <h1 className="text-[17px] font-semibold tracking-tight">{title}</h1>
      <div className="ml-auto">{children}</div>
    </header>
  );
}

export function Body({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-1 flex-col gap-3 px-4 pb-6", className)}>{children}</div>;
}

/* ----- buttons (50–52 px per the wireframe visual system) ----- */

export function BtnPrimary({
  children,
  onClick,
  disabled,
  caption,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  caption?: string;
}) {
  return (
    <div className="w-full">
      {caption ? <p className="mb-1 text-center text-[11px] text-subtle">{caption}</p> : null}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="h-[52px] w-full rounded-xl bg-accent text-[15px] font-semibold text-accent-fg transition-colors hover:bg-[#174935] disabled:bg-[#c6d2c6] disabled:text-[#71836f]"
      >
        {children}
      </button>
    </div>
  );
}

export function BtnOutline({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-[50px] w-full rounded-xl border border-[#c6d2c6] bg-surface text-[15px] font-semibold text-fg transition-colors hover:bg-elevated disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/* ----- status pills — every state has a text label + icon, never colour alone ----- */

type PillTone = "ok" | "progress" | "warn" | "danger" | "muted";

const PILL_TONES: Record<PillTone, string> = {
  ok: "bg-ok text-white",
  progress: "bg-ok-bg text-ok border border-ok/30",
  warn: "bg-warn-bg text-warn border border-warn/30",
  danger: "bg-danger text-white",
  muted: "bg-elevated text-muted border border-border",
};

export function Pill({
  tone,
  children,
  className,
}: {
  tone: PillTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        PILL_TONES[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}

/* ----- connectivity banners ----- */

export function OfflineBanner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-warn/40 bg-warn-bg px-3 py-2.5 text-[13px] font-semibold text-warn">
      <CloudOff className="size-4 shrink-0" strokeWidth={2} />
      OFFLINE – {text}
    </div>
  );
}

export function OnlineBanner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-ok/40 bg-ok-bg px-3 py-2.5 text-[13px] font-semibold text-ok">
      <Wifi className="size-4 shrink-0" strokeWidth={2} />
      ONLINE – {text}
    </div>
  );
}

/**
 * R-09 mode chip — ONLINE vs OFFLINE — QUEUED LOCALLY at the point of action.
 * Every save surface shows connectivity consequence, never colour alone.
 */
export function ModeChip({ online }: { online: boolean }) {
  if (online) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/30 bg-ok-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ok">
        <Wifi className="size-3" strokeWidth={2.5} aria-hidden />
        Online
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/40 bg-warn-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-warn">
      <CloudOff className="size-3" strokeWidth={2.5} aria-hidden />
      Offline — queued locally
    </span>
  );
}

/** H5/R-09 — consequence language for offline-first saves (not developer IDs). */
export const CONSEQUENCE = {
  savedOffline: "Saved on this phone — will send when signal returns.",
  pendingSync: "Saved on this phone — pending sync acknowledgement.",
  synced: "Submitted — server acknowledged this record.",
  queuedRadio: "Queued on device — forwards when coverage returns.",
  emptyReport: "No synced records in this window.",
} as const;

export function RiskBanner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger-bg px-3 py-2.5 text-[13px] font-bold text-danger">
      <WarnTriangle className="size-4 shrink-0" />
      {text}
    </div>
  );
}

export function GpsActive({ extra }: { extra?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-semibold text-ok">
      <LocateFixed className="size-4" strokeWidth={2} />
      GPS Tracking Active
      {extra}
    </div>
  );
}

/* ----- cards / rows ----- */

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface p-3", className)}>
      {children}
    </div>
  );
}

export function Row({ k, v, strong }: { k: string; v: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[12px] text-muted">{k}</span>
      <span className={cn("text-right text-[13px]", strong ? "font-bold" : "font-semibold")}>
        {v}
      </span>
    </div>
  );
}

export function Tile({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-surface px-3 py-2">
      <p className="text-[11px] text-muted">{k}</p>
      <p className="mt-0.5 text-[17px] font-bold tabular-nums">{v}</p>
    </div>
  );
}

export function HintCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[#c0cdc0] bg-surface px-3 py-2 text-[11.5px] leading-snug text-muted">
      {children}
    </div>
  );
}

export function SuccessCheck({ size = 64 }: { size?: number }) {
  return (
    <div
      className="mx-auto flex items-center justify-center rounded-full bg-ok"
      style={{ width: size, height: size }}
    >
      <Check
        className="text-white"
        style={{ width: size * 0.5, height: size * 0.5 }}
        strokeWidth={3}
      />
    </div>
  );
}

export function RadioRow({
  label,
  sub,
  icon,
  selected,
  onSelect,
}: {
  label: string;
  sub?: string;
  icon?: ReactNode;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex min-h-[52px] w-full items-center gap-3 rounded-xl border bg-surface px-3 py-2 text-left transition-colors",
        selected ? "border-ok ring-1 ring-ok" : "border-border hover:bg-elevated",
      )}
    >
      {icon ? <span className="text-accent">{icon}</span> : null}
      <span className="flex-1">
        <span className="block text-[14px] font-semibold">{label}</span>
        {sub ? <span className="block text-[12px] text-muted">{sub}</span> : null}
      </span>
      {selected ? (
        <span className="flex size-5 items-center justify-center rounded-full bg-ok">
          <Check className="size-3 text-white" strokeWidth={3} />
        </span>
      ) : (
        <span className="size-5 rounded-full border-2 border-[#c6d2c6]" />
      )}
    </button>
  );
}

function WarnTriangle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 3 2.5 20h19L12 3Z" strokeLinejoin="round" />
      <path d="M12 10v4.5" strokeLinecap="round" />
      <circle cx="12" cy="17.3" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* =================== park map =================== */

const ROUTE_D = "M46 236 C 96 212, 96 168, 150 150 S 236 108, 268 84 S 316 52, 330 44";

function usePathPoint(t: number) {
  const ref = useRef<SVGPathElement>(null);
  const [pt, setPt] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const len = el.getTotalLength();
    const p = el.getPointAtLength(Math.max(0, Math.min(1, t)) * len);
    setPt({ x: p.x, y: p.y });
  }, [t]);
  return { ref, pt };
}

/**
 * Route map used on the UC01 patrol screens: planned dashed route START→END,
 * solid recorded track drawn over it to `progress` (0..1), "You" marker at the
 * track tip. `covered` renders the full completed track.
 */
export function RouteMap({
  progress = 0,
  covered = false,
  height = 210,
  waypoint = false,
}: {
  progress?: number;
  covered?: boolean;
  height?: number;
  waypoint?: boolean;
}) {
  const t = covered ? 1 : progress;
  const { ref, pt } = usePathPoint(t);
  return (
    <div>
      <svg
        viewBox="0 0 358 260"
        style={{ height }}
        className="w-full rounded-xl border border-border"
        aria-label="Patrol route map"
        role="img"
      >
        <rect width="358" height="260" fill="#e9efe4" rx="12" />
        <MapTerrain />
        {/* planned route (dashed) */}
        <path
          d={ROUTE_D}
          fill="none"
          stroke="#5c7265"
          strokeWidth="2"
          strokeDasharray="6 5"
          opacity="0.75"
        />
        {/* recorded track */}
        <path
          ref={ref}
          d={ROUTE_D}
          fill="none"
          stroke="#1f5a43"
          strokeWidth="3.5"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${t * 100} 100`}
        />
        {/* START / END */}
        <circle cx="46" cy="236" r="5" fill="#f6f8f5" stroke="#1f5a43" strokeWidth="2" />
        <text x="58" y="240" fontSize="9" fontWeight="700" fill="#1f5a43">
          START
        </text>
        <circle
          cx="330"
          cy="44"
          r="5"
          fill={covered ? "#1f5a43" : "#f6f8f5"}
          stroke="#1f5a43"
          strokeWidth="2"
        />
        <text x="300" y="32" fontSize="9" fontWeight="700" fill="#1f5a43">
          END
        </text>
        {/* You */}
        {t > 0 && pt ? (
          <g>
            <circle cx={pt.x} cy={pt.y} r="9" fill="#1f5a43" opacity="0.18" />
            <circle cx={pt.x} cy={pt.y} r="4.5" fill="#1f5a43" stroke="#fff" strokeWidth="2" />
            {waypoint ? (
              <path
                d={`M${pt.x} ${pt.y - 22} c -7 0 -11 5 -11 11 0 8 11 18 11 18 s 11 -10 11 -18 c 0 -6 -4 -11 -11 -11 Z`}
                fill="#1f5a43"
                stroke="#fff"
                strokeWidth="1.5"
              />
            ) : null}
          </g>
        ) : null}
        <MapChrome />
      </svg>
      <MapLegend you={t > 0} />
    </div>
  );
}

/**
 * Risk map used on the UC03 screens: hatched HIGH-RISK ZONE at the top, EL-07
 * animal marker inside it, "You" moves toward the zone with `approach` (0..1).
 */
export function RiskMap({
  approach = 0,
  resolvedInside = false,
  height = 190,
}: {
  approach?: number;
  resolvedInside?: boolean;
  height?: number;
}) {
  const youX = 92 + approach * 120;
  const youY = 196 - approach * 78;
  const animal = resolvedInside ? { x: 150, y: 168 } : { x: 236, y: 64 };
  return (
    <div>
      <svg
        viewBox="0 0 358 240"
        style={{ height }}
        className="w-full rounded-xl border border-border"
        aria-label="Risk zone map"
        role="img"
      >
        <defs>
          <pattern
            id="hatch"
            width="7"
            height="7"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="7" stroke="#b3261e" strokeWidth="1.4" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="358" height="240" fill="#e9efe4" rx="12" />
        <MapTerrain />
        {/* park boundary */}
        <path
          d="M18 150 C 90 128, 190 150, 340 108"
          fill="none"
          stroke="#3b7a57"
          strokeWidth="2"
          strokeDasharray="7 5"
          opacity="0.8"
        />
        <text x="22" y="166" fontSize="8.5" fontWeight="700" fill="#3b7a57" letterSpacing="0.5">
          PARK
        </text>
        {/* high-risk zone */}
        <g>
          <rect
            x="168"
            y="22"
            width="168"
            height="78"
            rx="8"
            fill="url(#hatch)"
            stroke="#b3261e"
            strokeWidth="1.8"
            strokeDasharray="6 4"
          />
          <text x="178" y="36" fontSize="8" fontWeight="700" fill="#b3261e" letterSpacing="0.6">
            HIGH-RISK ZONE · FARMLAND
          </text>
        </g>
        {/* animal marker */}
        <g>
          <circle
            cx={animal.x}
            cy={animal.y}
            r="11"
            fill="none"
            stroke="#b3261e"
            strokeWidth="2.5"
          />
          <circle cx={animal.x} cy={animal.y} r="4" fill="#b3261e" />
          <text x={animal.x + 15} y={animal.y + 4} fontSize="9" fontWeight="700" fill="#b3261e">
            EL-07
          </text>
        </g>
        {/* You */}
        <g>
          <circle cx={youX} cy={youY} r="9" fill="#1f5a43" opacity="0.18" />
          <circle cx={youX} cy={youY} r="4.5" fill="#1f5a43" stroke="#fff" strokeWidth="2" />
          <text x={youX - 10} y={youY + 18} fontSize="9" fontWeight="700" fill="#1f5a43">
            You
          </text>
        </g>
        <MapChrome h={240} />
      </svg>
    </div>
  );
}

/**
 * Boundary map used on the UC02/UC04 screens: dashed park boundary, village
 * blocks, red location pin.
 */
export function PinMap({
  caption,
  height = 150,
  pinLabel = "Incident location",
}: {
  caption?: string;
  height?: number;
  pinLabel?: string;
}) {
  return (
    <svg
      viewBox="0 0 358 180"
      style={{ height }}
      className="w-full rounded-xl border border-border"
      aria-label={pinLabel}
      role="img"
    >
      <rect width="358" height="180" fill="#e9efe4" rx="12" />
      <path
        d="M0 96 C 80 72, 180 104, 358 64"
        fill="none"
        stroke="#3b7a57"
        strokeWidth="2"
        strokeDasharray="7 5"
        opacity="0.85"
      />
      <text x="14" y="26" fontSize="8.5" fontWeight="700" fill="#3b7a57" letterSpacing="0.6">
        PARK BOUNDARY
      </text>
      {/* field rows */}
      <g stroke="#9bb092" strokeWidth="2" strokeDasharray="12 9" opacity="0.65">
        <line x1="26" y1="124" x2="150" y2="124" />
        <line x1="26" y1="142" x2="128" y2="142" />
        <line x1="26" y1="160" x2="150" y2="160" />
      </g>
      {/* village blocks */}
      <g fill="#cdd9c6" stroke="#8ba183" strokeWidth="1.2">
        <rect x="258" y="126" width="18" height="14" rx="2" />
        <rect x="282" y="126" width="18" height="14" rx="2" />
        <rect x="306" y="126" width="18" height="14" rx="2" />
      </g>
      {/* pin */}
      <g>
        <path
          d="M179 58 c -10 0 -16 7 -16 15 0 11 16 27 16 27 s 16 -16 16 -27 c 0 -8 -6 -15 -16 -15 Z"
          fill="#c62828"
          stroke="#fff"
          strokeWidth="2"
        />
        <circle cx="179" cy="73" r="5" fill="#fff" />
        <text x="200" y="66" fontSize="9" fontWeight="700" fill="#c62828">
          {pinLabel}
        </text>
      </g>
      {caption ? (
        <text x="346" y="170" fontSize="8" fill="#5f7366" textAnchor="end">
          {caption}
        </text>
      ) : null}
      <MapChrome h={180} />
    </svg>
  );
}

function MapLegend({ you }: { you: boolean }) {
  return (
    <div className="mt-1.5 flex items-center gap-4 px-1 text-[11px] text-muted">
      <span className="flex items-center gap-1.5">
        <svg width="18" height="4" aria-hidden>
          <line
            x1="0"
            y1="2"
            x2="18"
            y2="2"
            stroke="#5c7265"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
        </svg>
        Planned
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="18" height="4" aria-hidden>
          <line x1="0" y1="2" x2="18" y2="2" stroke="#1f5a43" strokeWidth="3" />
        </svg>
        Recorded track
      </span>
      {you ? (
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-accent" aria-hidden />
          You
        </span>
      ) : null}
    </div>
  );
}

function MapTerrain() {
  return (
    <g>
      <path d="M0 200 Q 70 150 150 190 T 358 170 V 260 H 0 Z" fill="#dbe7d2" />
      <path d="M210 0 Q 270 60 358 40 V 0 Z" fill="#d3e2c9" />
      <ellipse cx="86" cy="196" rx="42" ry="16" fill="#c6d8e0" opacity="0.9" />
      <path
        d="M0 60 Q 60 90 120 66 T 220 110 "
        fill="none"
        stroke="#cdddc2"
        strokeWidth="14"
        strokeLinecap="round"
        opacity="0.6"
      />
    </g>
  );
}

function MapChrome({ h = 260 }: { h?: number }) {
  return (
    <g>
      {/* compass */}
      <g transform="translate(336, 16)">
        <Needle />
      </g>
      {/* scale bar */}
      <line x1="16" y1={h - 14} x2="56" y2={h - 14} stroke="#5f7366" strokeWidth="2" />
      <text x="20" y={h - 19} fontSize="8" fill="#5f7366">
        500 m
      </text>
    </g>
  );
}

function Needle() {
  return (
    <g>
      <text x="0" y="-4" fontSize="9" fontWeight="700" fill="#4a5f52" textAnchor="middle">
        N
      </text>
      <path d="M0 2 L4 12 L0 9 L-4 12 Z" fill="#4a5f52" />
    </g>
  );
}

/**
 * Green confirmation note (check circle + title + optional detail) used by
 * the "Waypoint Saved" / "ACKNOWLEDGED" states across the flows.
 */
export function ConfirmNote({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-ok/40 bg-ok-bg px-3 py-2.5">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ok">
        <Check className="size-3 text-white" strokeWidth={3} />
      </span>
      <span>
        <span className="block text-[13px] font-bold text-ok">{title}</span>
        {sub ? <span className="block text-[11.5px] text-ok/80">{sub}</span> : null}
      </span>
    </div>
  );
}
