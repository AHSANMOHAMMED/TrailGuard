import { x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as CardTitle, f as useField, i as Card, n as Badge, o as ROUTE_META, r as Button, s as SyncBadge, t as AppShell, u as fmtClock } from "./card-DAvG1X27.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/patrol-TNYzqpDD.js
var import_jsx_runtime = require_jsx_runtime();
function PatrolPage() {
	const { patrols, startPatrol, addWaypoint, finishPatrol } = useField();
	const active = patrols.find((p) => p.status === "ACTIVE");
	const latest = patrols[0];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-[11px] uppercase tracking-widest text-muted",
			children: "UC01"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "mt-1 text-3xl font-medium tracking-tight",
			children: "Patrol"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-muted",
			children: "Start assigned route, log GPS or manual waypoints, finish locally, then sync one record."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "mt-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Mission profile" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						tone: active ? "ok" : "muted",
						children: active ? "Active" : "Standby"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 font-mono text-xl",
					children: ROUTE_META.id
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: [
						ROUTE_META.name,
						" · ",
						ROUTE_META.sector
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 grid grid-cols-3 gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
							k: "Distance",
							v: `${ROUTE_META.distanceKm} km`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
							k: "Est. time",
							v: ROUTE_META.estTime
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
							k: "Gain",
							v: `+${ROUTE_META.gainM} m`
						})
					]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "mt-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Pre-patrol checks" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-3 space-y-2 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
						ok: true,
						label: "Ranger authorized",
						value: "RN-402 Mercer"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
						ok: true,
						label: "Offline vector map",
						value: "Park_Sector_04.vmap"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
						ok: true,
						label: "Device storage",
						value: "14.2 GB free"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
						ok: false,
						warn: true,
						label: "Connectivity",
						value: "Field mode allowed"
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "mt-3 overflow-hidden p-0",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "px-4 pt-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Track" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrailMap, { points: active?.waypoints ?? latest?.waypoints ?? [] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "px-4 pb-3 font-mono text-[11px] text-subtle",
					children: [(active ?? latest)?.waypoints.length ?? 0, " waypoints · source GPS / MANUAL"]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-4 flex flex-col gap-2 sm:flex-row",
			children: !active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				className: "flex-1",
				onClick: () => {
					const p = startPatrol();
					toast.message(`Patrol started ${p.patrolId.slice(0, 8)}`);
				},
				children: "Start patrol"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					className: "flex-1",
					onClick: () => addWaypoint("GPS"),
					children: "GPS waypoint"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					className: "flex-1",
					onClick: () => addWaypoint("MANUAL"),
					children: "Manual mark"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "flex-1",
					onClick: () => {
						const p = finishPatrol();
						toast.message(`Completed · PENDING ${p?.waypoints.length ?? 0} points`);
					},
					children: "Finish"
				})
			] })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "mt-8 text-sm font-medium text-muted",
			children: "On device"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-3 space-y-2",
			children: patrols.slice(0, 6).map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-mono text-sm",
					children: [
						p.status,
						" · ",
						p.waypoints.length,
						" pts"
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted",
					children: fmtClock(p.startedAt)
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SyncBadge, { state: p.syncState })]
			}, p.patrolId))
		})
	] });
}
function Metric({ k, v }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md bg-elevated px-3 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-[10px] uppercase text-subtle",
			children: k
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-sm",
			children: v
		})]
	});
}
function Check({ ok, warn, label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: "flex items-center justify-between gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-fg",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: warn ? "font-mono text-xs text-warn" : "font-mono text-xs text-ok",
			children: ok || warn ? value : value
		})]
	});
}
function TrailMap({ points }) {
	const w = 640;
	const h = 180;
	const path = points.length > 1 ? points.map((p, i) => {
		const x = 24 + i / Math.max(points.length - 1, 1) * 592;
		const y = 144 - (p.lat - 6.4) / .04 * 80;
		return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${Math.min(160, Math.max(20, y)).toFixed(1)}`;
	}).join(" ") : "";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: `0 0 ${w} ${h}`,
		className: "mt-2 h-40 w-full text-accent",
		"aria-label": "Patrol track",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "0",
				y: "0",
				width: w,
				height: h,
				fill: "transparent"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M0 140 Q160 100 320 120 T640 90",
				fill: "none",
				stroke: "currentColor",
				strokeOpacity: "0.15",
				strokeWidth: "8"
			}),
			path && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: path,
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "2.5"
			}),
			points.map((p, i) => {
				const x = 24 + i / Math.max(points.length - 1, 1) * 592;
				const y = 144 - (p.lat - 6.4) / .04 * 80;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: x,
					cy: Math.min(160, Math.max(20, y)),
					r: "3.5",
					fill: "currentColor"
				}, i);
			})
		]
	});
}
//#endregion
export { PatrolPage as component };
