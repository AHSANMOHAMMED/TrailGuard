import { x as require_jsx_runtime, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as CardTitle, d as fmtTime, f as useField, i as Card, n as Badge, o as ROUTE_META, r as Button, t as AppShell } from "./card-DAvG1X27.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DFHqj9Mm.js
var import_jsx_runtime = require_jsx_runtime();
function Home() {
	const { patrols, incidents, alerts, pendingCount, lastSyncAt, online } = useField();
	const pending = pendingCount();
	const active = patrols.find((p) => p.status === "ACTIVE");
	const openAlerts = alerts.filter((a) => a.status !== "CLOSED");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-[11px] uppercase tracking-widest text-muted",
			children: "Yala National Park"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "mt-1 text-3xl font-medium tracking-tight",
			children: "Field desk"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 max-w-prose text-sm text-muted",
			children: "Offline-first records. Writes land on this device first. Nothing is marked submitted until sync acknowledgement."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Pending",
					value: String(pending),
					hint: online ? "Ready to sync" : "Held offline"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Patrols",
					value: String(patrols.length),
					hint: "All on device"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Incidents",
					value: String(incidents.length),
					hint: "Local + synced"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Open alerts",
					value: String(openAlerts.length),
					hint: "Conflict desk"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "mt-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Assigned route" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 font-mono text-lg text-fg",
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
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 font-mono text-xs text-subtle",
						children: [
							ROUTE_META.distanceKm,
							" km · ",
							ROUTE_META.estTime,
							" · +",
							ROUTE_META.gainM,
							" m"
						]
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					tone: active ? "ok" : "muted",
					children: active ? "Active" : "Idle"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					className: "w-full sm:w-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/patrol",
						children: active ? "Open active patrol" : "Start patrol"
					})
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 grid gap-3 sm:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Queue" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-3 text-sm text-fg",
					children: [pending, " records waiting for complete receipt"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-xs text-muted",
					children: ["Last sync ", lastSyncAt ? fmtTime(lastSyncAt) : "never"]
				})
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Conflict" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-fg",
					children: openAlerts[0] ? `${openAlerts[0].animal} in ${openAlerts[0].zone}` : "No open risk alerts"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					variant: "secondary",
					size: "sm",
					className: "mt-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/conflict",
						children: "Open desk"
					})
				})
			] })]
		})
	] });
}
function Stat({ label, value, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[10px] uppercase tracking-wide text-muted",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 font-mono text-2xl tabular-nums",
				children: value
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] text-subtle",
				children: hint
			})
		]
	});
}
//#endregion
export { Home as component };
