import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as CardTitle, d as fmtTime, f as useField, i as Card, l as downloadText, r as Button, t as AppShell } from "./card-DAvG1X27.mjs";
import { n as Label, t as Input } from "./label-BQCEQLgp.mjs";
import { a as ResponsiveContainer, i as Bar, n as YAxis, o as Tooltip, r as XAxis, t as BarChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reports-B6vZvaSc.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ReportsPage() {
	const { snapshot, generateReport, incidents } = useField();
	const [from, setFrom] = (0, import_react.useState)("2026-08-01");
	const [to, setTo] = (0, import_react.useState)("2026-08-31");
	const pendingExcluded = incidents.filter((i) => i.syncState === "PENDING").length;
	const chart = snapshot ? Object.entries(snapshot.byType).map(([name, count]) => ({
		name,
		count
	})) : [];
	const axis = (0, import_react.useMemo)(() => "currentColor", []);
	function exportCsv() {
		if (!snapshot) return;
		const rows = [
			"field,value",
			`reportId,${snapshot.reportId}`,
			`park,${snapshot.park}`,
			`from,${snapshot.from}`,
			`to,${snapshot.to}`,
			`cutoff,${snapshot.cutoff}`,
			`incidents,${snapshot.incidentCount}`,
			`patrols,${snapshot.patrolCount}`,
			`coverage,${snapshot.coveragePercent}`,
			`conflicts,${snapshot.conflictCount}`
		];
		downloadText(`trailguard-${snapshot.reportId.slice(0, 8)}.csv`, rows.join("\n"));
		toast.success("Exported same snapshot");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-[11px] uppercase tracking-widest text-muted",
			children: "UC04"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "mt-1 text-3xl font-medium tracking-tight",
			children: "Reports"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-muted",
			children: "One consistent snapshot of synced records. Pending field writes are excluded. Export uses the same snapshot id."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "mt-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Filters" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 grid gap-3 sm:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "from",
						children: "From"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "from",
						type: "date",
						className: "mt-2",
						value: from,
						onChange: (e) => setFrom(e.target.value)
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "to",
						children: "To"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "to",
						type: "date",
						className: "mt-2",
						value: to,
						onChange: (e) => setTo(e.target.value)
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-3 text-xs text-subtle",
					children: ["Park: Yala National Park · pending excluded: ", pendingExcluded]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "mt-4 w-full",
					onClick: () => {
						generateReport(from, to);
						toast.message("Snapshot generated");
					},
					children: "Generate report"
				})
			]
		}),
		snapshot && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					k: "Incidents",
					v: String(snapshot.incidentCount)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					k: "Patrols",
					v: String(snapshot.patrolCount)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					k: "Coverage",
					v: `${snapshot.coveragePercent}%`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					k: "Conflicts",
					v: String(snapshot.conflictCount)
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "mt-3 text-muted",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "By type" }),
				chart.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-sm text-muted",
					children: "No synced incidents in this window."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 h-48",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
						width: "100%",
						height: "100%",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
							data: chart,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
									dataKey: "name",
									stroke: axis,
									fontSize: 11,
									tickLine: false
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
									stroke: axis,
									fontSize: 11,
									allowDecimals: false,
									tickLine: false
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { contentStyle: {
									background: "var(--color-elevated)",
									border: "1px solid var(--color-border)",
									color: "var(--color-fg)"
								} }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
									dataKey: "count",
									fill: "var(--color-accent)",
									radius: [
										4,
										4,
										0,
										0
									]
								})
							]
						})
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-3 font-mono text-[11px] text-subtle",
					children: [
						snapshot.reportId.slice(0, 8),
						" · cutoff ",
						fmtTime(snapshot.cutoff)
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					className: "mt-3 w-full",
					onClick: exportCsv,
					children: "Export CSV"
				})
			]
		})] })
	] });
}
function Stat({ k, v }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-[10px] uppercase text-muted",
			children: k
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 font-mono text-xl tabular-nums",
			children: v
		})]
	});
}
//#endregion
export { ReportsPage as component };
