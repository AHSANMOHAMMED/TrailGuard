import { x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as CardTitle, d as fmtTime, f as useField, i as Card, n as Badge, r as Button, t as AppShell, u as fmtClock } from "./card-DAvG1X27.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/conflict-CEKCt9_o.js
var import_jsx_runtime = require_jsx_runtime();
function ConflictPage() {
	const { alerts, officers, assignments, ingestCollar, assignOfficer, acknowledge } = useField();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-[11px] uppercase tracking-widest text-muted",
			children: "UC03"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "mt-1 text-3xl font-medium tracking-tight",
			children: "Conflict"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-muted",
			children: "Collar reading, risk assessment, assignment, notification, then a separate officer acknowledgement."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			className: "mt-6 w-full sm:w-auto",
			variant: "secondary",
			onClick: () => {
				const a = ingestCollar();
				toast.message(a ? `Alert ${a.alertId} · ${a.zone}` : "No alert");
			},
			children: "Ingest collar reading"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-4 space-y-3",
			children: alerts.map((alert) => {
				const ra = assignments.find((x) => x.alertId === alert.alertId);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, { children: [
								alert.alertId,
								" · ",
								alert.animal
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm",
								children: alert.zone
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 font-mono text-[11px] text-subtle",
								children: [
									"Obs ",
									fmtClock(alert.observedAt),
									" · Recv ",
									fmtClock(alert.receivedAt),
									" · ",
									alert.confidence
								]
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							tone: alert.status === "OPEN" ? "warn" : alert.status === "ASSIGNED" ? "accent" : "ok",
							children: alert.status
						})]
					}),
					alert.status === "OPEN" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 space-y-2",
						children: [officers.filter((o) => o.available).map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "secondary",
							className: "w-full justify-between",
							onClick: () => {
								const asg = assignOfficer(alert.alertId, o.officerId);
								toast.message(asg ? `Assigned ${o.name} · delivery ${asg.deliveryState}` : "Could not assign");
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: o.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-[10px] uppercase text-muted",
								children: o.role
							})]
						}, o.officerId)), officers.filter((o) => o.available).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-warn",
							children: "No available officer — leave OPEN and escalate."
						})]
					}),
					ra && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 rounded-md bg-elevated p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm",
								children: [
									ra.officerName,
									" · delivery ",
									ra.deliveryState
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 font-mono text-[11px] text-subtle",
								children: [
									"Created ",
									fmtTime(ra.createdAt),
									ra.acknowledgedAt ? ` · Ack ${fmtTime(ra.acknowledgedAt)}` : " · awaiting ack"
								]
							}),
							!ra.acknowledgedAt && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								className: "mt-3",
								onClick: () => {
									acknowledge(ra.raId);
									toast.success("Acknowledged — distinct from delivery");
								},
								children: "Officer acknowledge"
							})
						]
					})
				] }, alert.alertId);
			})
		})
	] });
}
//#endregion
export { ConflictPage as component };
