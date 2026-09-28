import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { f as useRouterState, x as require_jsx_runtime, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Map, c as CloudOff, i as Radio, n as Siren, o as FileChartColumnIncreasing, r as Shield, s as Cloud } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as Slot } from "../_libs/radix-ui__react-slot.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/card-DAvG1X27.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function uid() {
	return crypto.randomUUID();
}
function fmtTime(iso) {
	return new Date(iso).toLocaleString(void 0, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	});
}
function fmtClock(iso) {
	return new Date(iso).toLocaleTimeString(void 0, {
		hour: "2-digit",
		minute: "2-digit"
	});
}
function downloadText(filename, text, mime = "text/csv") {
	const blob = new Blob([text], { type: mime });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
var ROUTE = {
	id: "RT-07",
	name: "North Ridge Corridor",
	sector: "Sector 04-North",
	distanceKm: 12.4,
	estTime: "4h 30m",
	gainM: 640
};
var SEED_OFFICERS = [
	{
		officerId: "off-mercer",
		name: "RN-402 Mercer",
		role: "RANGER",
		available: false
	},
	{
		officerId: "off-silva",
		name: "Ranger Silva",
		role: "RANGER",
		available: true
	},
	{
		officerId: "off-fernando",
		name: "Liaison Fernando",
		role: "LIAISON",
		available: true
	}
];
function seedSynced() {
	const t0 = (/* @__PURE__ */ new Date("2026-08-12T06:10:00Z")).toISOString();
	const t1 = (/* @__PURE__ */ new Date("2026-08-12T10:40:00Z")).toISOString();
	return {
		patrols: [{
			patrolId: "pt-seed-01",
			routeId: ROUTE.id,
			routeName: ROUTE.name,
			officerId: "off-mercer",
			officerName: "RN-402 Mercer",
			status: "COMPLETED",
			startedAt: t0,
			completedAt: t1,
			syncState: "SYNCED",
			waypoints: [{
				pointId: "wp-s1",
				lat: 6.401,
				lng: 81.118,
				source: "GPS",
				recordedAt: t0,
				label: "WP-01"
			}, {
				pointId: "wp-s2",
				lat: 6.412,
				lng: 81.126,
				source: "GPS",
				recordedAt: t1,
				label: "WP-08"
			}]
		}],
		incidents: [{
			reportId: "ir-seed-01",
			type: "Snare",
			description: "Wire snare recovered near dry creek",
			lat: 6.408,
			lng: 81.121,
			locationSource: "GPS",
			observedAt: "2026-08-14T09:20:00Z",
			syncState: "SYNCED",
			hasPhoto: true
		}, {
			reportId: "ir-seed-02",
			type: "Crop-raid",
			description: "Elephant damage, eastern farms",
			lat: 6.39,
			lng: 81.14,
			locationSource: "MANUAL",
			observedAt: "2026-08-20T18:05:00Z",
			syncState: "SYNCED",
			hasPhoto: false
		}]
	};
}
var seeded = seedSynced();
var useField = create()(persist((set, get) => ({
	online: true,
	syncing: false,
	lastSyncAt: "2026-08-31T06:12:00Z",
	patrols: seeded.patrols,
	incidents: seeded.incidents,
	officers: SEED_OFFICERS,
	snapshot: null,
	alerts: [{
		alertId: "AL-19",
		animal: "Elephant",
		zone: "Z3 Farmland",
		observedAt: "2026-09-24T11:02:00Z",
		receivedAt: "2026-09-24T11:04:00Z",
		confidence: "High",
		status: "OPEN"
	}],
	assignments: [],
	setOnline: (v) => set({ online: v }),
	activePatrol: () => get().patrols.find((p) => p.status === "ACTIVE"),
	pendingCount: () => get().patrols.filter((p) => p.syncState === "PENDING").length + get().incidents.filter((i) => i.syncState === "PENDING").length,
	startPatrol: () => {
		const existing = get().activePatrol();
		if (existing) return existing;
		const p = {
			patrolId: uid(),
			routeId: ROUTE.id,
			routeName: ROUTE.name,
			officerId: "off-mercer",
			officerName: "RN-402 Mercer",
			status: "ACTIVE",
			startedAt: (/* @__PURE__ */ new Date()).toISOString(),
			syncState: "PENDING",
			waypoints: []
		};
		set({ patrols: [p, ...get().patrols] });
		return p;
	},
	addWaypoint: (source) => {
		const active = get().activePatrol();
		if (!active) return null;
		const n = active.waypoints.length + 1;
		const wp = {
			pointId: uid(),
			lat: 6.4 + n * .004 + Math.random() * .001,
			lng: 81.118 + n * .003,
			source,
			recordedAt: (/* @__PURE__ */ new Date()).toISOString(),
			label: `WP-${String(n).padStart(2, "0")}`
		};
		set({ patrols: get().patrols.map((p) => p.patrolId === active.patrolId ? {
			...p,
			waypoints: [...p.waypoints, wp],
			syncState: "PENDING"
		} : p) });
		return wp;
	},
	finishPatrol: () => {
		const active = get().activePatrol();
		if (!active) return null;
		const done = {
			...active,
			status: "COMPLETED",
			completedAt: (/* @__PURE__ */ new Date()).toISOString(),
			syncState: "PENDING"
		};
		set({ patrols: get().patrols.map((p) => p.patrolId === active.patrolId ? done : p) });
		return done;
	},
	createIncident: (input) => {
		const ir = {
			reportId: uid(),
			type: input.type,
			description: input.description,
			lat: 6.405 + Math.random() * .01,
			lng: 81.12 + Math.random() * .01,
			locationSource: input.locationSource,
			observedAt: (/* @__PURE__ */ new Date()).toISOString(),
			syncState: "PENDING",
			hasPhoto: input.hasPhoto
		};
		set({ incidents: [ir, ...get().incidents] });
		return ir;
	},
	ingestCollar: () => {
		const openSame = get().alerts.find((a) => a.animal === "Elephant" && a.zone === "Z3 Farmland" && a.status !== "CLOSED");
		if (openSame) {
			const updated = {
				...openSame,
				receivedAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			set({ alerts: get().alerts.map((a) => a.alertId === openSame.alertId ? updated : a) });
			return updated;
		}
		const alert = {
			alertId: `AL-${Math.floor(20 + Math.random() * 80)}`,
			animal: "Elephant",
			zone: "Z3 Farmland",
			observedAt: (/* @__PURE__ */ new Date()).toISOString(),
			receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
			confidence: "High",
			status: "OPEN"
		};
		set({ alerts: [alert, ...get().alerts] });
		return alert;
	},
	assignOfficer: (alertId, officerId) => {
		const officer = get().officers.find((o) => o.officerId === officerId);
		if (!officer) return null;
		const ra = {
			raId: uid(),
			alertId,
			officerId,
			officerName: officer.name,
			deliveryState: get().online ? "SENT" : "FAILED",
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		set({
			assignments: [ra, ...get().assignments],
			alerts: get().alerts.map((a) => a.alertId === alertId ? {
				...a,
				status: "ASSIGNED"
			} : a),
			officers: get().officers.map((o) => o.officerId === officerId ? {
				...o,
				available: false
			} : o)
		});
		return ra;
	},
	acknowledge: (raId) => {
		set({ assignments: get().assignments.map((a) => a.raId === raId ? {
			...a,
			acknowledgedAt: (/* @__PURE__ */ new Date()).toISOString()
		} : a) });
	},
	generateReport: (from, to) => {
		const fromD = new Date(from).getTime();
		const toD = (/* @__PURE__ */ new Date(to + "T23:59:59")).getTime();
		const syncedInc = get().incidents.filter((i) => {
			const t = new Date(i.observedAt).getTime();
			return i.syncState === "SYNCED" && t >= fromD && t <= toD;
		});
		const syncedPat = get().patrols.filter((p) => {
			const t = new Date(p.startedAt).getTime();
			return p.syncState === "SYNCED" && p.status === "COMPLETED" && t >= fromD && t <= toD;
		});
		const byType = {};
		for (const i of syncedInc) byType[i.type] = (byType[i.type] ?? 0) + 1;
		const snap = {
			reportId: uid(),
			park: "Yala National Park",
			from,
			to,
			cutoff: (/* @__PURE__ */ new Date(to + "T23:59:59")).toISOString(),
			generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
			incidentCount: syncedInc.length,
			patrolCount: syncedPat.length,
			coveragePercent: Math.min(92, 48 + syncedPat.length * 10 + syncedInc.length * 4),
			conflictCount: get().alerts.length,
			byType
		};
		set({ snapshot: snap });
		return snap;
	},
	synchronize: async () => {
		if (!get().online) throw new Error("Offline — records stay PENDING on device.");
		set({ syncing: true });
		await new Promise((r) => setTimeout(r, 850));
		let patrols = 0;
		let incidents = 0;
		set({
			patrols: get().patrols.map((p) => {
				if (p.syncState === "PENDING" && p.status === "COMPLETED") {
					patrols += 1;
					return {
						...p,
						syncState: "SYNCED"
					};
				}
				return p;
			}),
			incidents: get().incidents.map((i) => {
				if (i.syncState === "PENDING") {
					incidents += 1;
					return {
						...i,
						syncState: "SYNCED"
					};
				}
				return i;
			}),
			lastSyncAt: (/* @__PURE__ */ new Date()).toISOString(),
			syncing: false
		});
		return {
			patrols,
			incidents
		};
	}
}), {
	name: "trailguard-field",
	skipHydration: true
}));
var ROUTE_META = ROUTE;
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 min-h-11 px-4", {
	variants: {
		variant: {
			default: "bg-accent text-accent-fg hover:bg-accent/90",
			secondary: "bg-elevated text-fg border border-border hover:bg-surface",
			ghost: "text-muted hover:text-fg hover:bg-elevated",
			warn: "bg-warn text-bg hover:bg-warn/90"
		},
		size: {
			default: "h-11",
			sm: "h-9 min-h-9 px-3 text-xs",
			lg: "h-12 text-base"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		ref,
		...props
	});
});
Button.displayName = "Button";
function Badge({ className, tone = "muted", children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wide uppercase", {
			muted: "bg-elevated text-muted border-border",
			ok: "bg-ok/15 text-ok border-ok/30",
			warn: "bg-warn/15 text-warn border-warn/30",
			danger: "bg-danger/15 text-danger border-danger/30",
			accent: "bg-accent/15 text-accent border-accent/30"
		}[tone], className),
		children
	});
}
var NAV = [
	{
		to: "/",
		label: "Ops",
		icon: Shield,
		exact: true
	},
	{
		to: "/patrol",
		label: "Patrol",
		icon: Map
	},
	{
		to: "/incidents",
		label: "Incidents",
		icon: Radio
	},
	{
		to: "/conflict",
		label: "Conflict",
		icon: Siren
	},
	{
		to: "/reports",
		label: "Reports",
		icon: FileChartColumnIncreasing
	}
];
function AppShell({ children }) {
	const path = useRouterState({ select: (s) => s.location.pathname });
	const { online, setOnline, lastSyncAt, syncing, synchronize, pendingCount } = useField();
	const pending = pendingCount();
	(0, import_react.useEffect)(() => {
		useField.persist.rehydrate();
	}, []);
	async function onSync() {
		try {
			const r = await synchronize();
			toast.success(`Synced ${r.patrols} patrols, ${r.incidents} incidents`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Sync failed");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-dvh flex-col bg-bg text-fg md:flex-row",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "hidden w-56 shrink-0 border-r border-border bg-surface md:flex md:flex-col",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 px-5 py-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm font-semibold tracking-tight",
						children: "TrailGuard"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-mono text-[10px] uppercase tracking-wider text-muted",
						children: "Field ops"
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "flex flex-1 flex-col gap-1 px-3",
					children: NAV.map((item) => {
						const active = item.exact ? path === item.to : path.startsWith(item.to);
						const Icon = item.icon;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: item.to,
							className: cn("flex min-h-11 items-center gap-2 rounded-md px-3 text-sm transition-colors duration-150", active ? "bg-elevated text-fg" : "text-muted hover:bg-elevated hover:text-fg"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
								className: "size-4",
								strokeWidth: 1.75
							}), item.label]
						}, item.to);
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-5 py-4 font-mono text-[10px] text-subtle",
					children: "Yala · RT-07"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex min-w-0 flex-1 flex-col",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 md:hidden",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm font-semibold",
								children: "TrailGuard"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "hidden items-center gap-2 md:flex",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono text-[11px] uppercase tracking-wide text-muted",
								children: ["Last sync ", lastSyncAt ? fmtTime(lastSyncAt) : "never"]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ml-auto flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setOnline(!online),
								className: "flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-muted",
								children: [online ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cloud, { className: "size-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloudOff, { className: "size-3.5" }), online ? "Online" : "Offline"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: pending ? "warn" : "secondary",
								onClick: onSync,
								disabled: syncing,
								children: syncing ? "Syncing…" : pending ? `Sync ${pending}` : "Sync"
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					className: "mx-auto w-full max-w-3xl flex-1 px-4 py-5 pb-24 md:pb-8",
					children
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-surface/95 backdrop-blur-sm md:hidden",
					children: NAV.map((item) => {
						const active = item.exact ? path === item.to : path.startsWith(item.to);
						const Icon = item.icon;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: item.to,
							className: cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] uppercase tracking-wide", active ? "text-accent" : "text-muted"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
								className: "size-4",
								strokeWidth: 1.75
							}), item.label]
						}, item.to);
					})
				})
			]
		})]
	});
}
function Mark() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: "22",
		height: "22",
		viewBox: "0 0 24 24",
		fill: "none",
		"aria-hidden": true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M12 3 4.5 6.5v5.2c0 4.7 3.2 8.7 7.5 10.3 4.3-1.6 7.5-5.6 7.5-10.3V6.5L12 3Z",
			stroke: "currentColor",
			strokeWidth: "1.5",
			className: "text-accent"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M8 13.5c2.2-1.6 3.4-1.6 8-3",
			stroke: "currentColor",
			strokeWidth: "1.5",
			className: "text-fg"
		})]
	});
}
function SyncBadge({ state }) {
	if (state === "PENDING") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
		tone: "warn",
		children: "Pending"
	});
	if (state === "FAILED") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
		tone: "danger",
		children: "Failed"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
		tone: "ok",
		children: "Synced"
	});
}
function Card({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("rounded-xl border border-border bg-surface p-4", className),
		...props
	});
}
function CardTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
		className: cn("text-sm font-medium tracking-wide text-muted", className),
		...props
	});
}
//#endregion
export { CardTitle as a, cn as c, fmtTime as d, useField as f, Card as i, downloadText as l, Badge as n, ROUTE_META as o, Button as r, SyncBadge as s, AppShell as t, fmtClock as u };
