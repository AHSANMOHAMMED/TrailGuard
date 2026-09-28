import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as CardTitle, d as fmtTime, f as useField, i as Card, r as Button, s as SyncBadge, t as AppShell } from "./card-DAvG1X27.mjs";
import { n as Label, r as Textarea } from "./label-BQCEQLgp.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/incidents-CxnaW7rd.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var TYPES = [
	"Snare",
	"Crop-raid",
	"Poaching sign",
	"Injured animal",
	"Other"
];
function IncidentsPage() {
	const { incidents, createIncident } = useField();
	const [type, setType] = (0, import_react.useState)("Snare");
	const [description, setDescription] = (0, import_react.useState)("");
	const [source, setSource] = (0, import_react.useState)("MANUAL");
	const [photo, setPhoto] = (0, import_react.useState)(true);
	function save() {
		if (!description.trim()) {
			toast.error("Description is required");
			return;
		}
		const ir = createIncident({
			type,
			description: description.trim(),
			locationSource: source,
			hasPhoto: photo
		});
		setDescription("");
		toast.message(`Saved on device · ${ir.reportId.slice(0, 8)} PENDING`);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-[11px] uppercase tracking-widest text-muted",
			children: "UC02"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "mt-1 text-3xl font-medium tracking-tight",
			children: "Incidents"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-muted",
			children: "Capture a report without coverage. Status stays PENDING until complete-receipt on sync."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "mt-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "New report" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "type",
						children: "Category"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 flex flex-wrap gap-2",
						children: TYPES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setType(t),
							className: type === t ? "min-h-11 rounded-md bg-accent px-3 text-sm text-accent-fg" : "min-h-11 rounded-md border border-border px-3 text-sm text-muted",
							children: t
						}, t))
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "desc",
						children: "Description"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
						id: "desc",
						className: "mt-2",
						value: description,
						onChange: (e) => setDescription(e.target.value),
						placeholder: "Wire snare near dry creek track"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								size: "sm",
								variant: source === "GPS" ? "default" : "secondary",
								onClick: () => setSource("GPS"),
								children: "GPS"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								size: "sm",
								variant: source === "MANUAL" ? "default" : "secondary",
								onClick: () => setSource("MANUAL"),
								children: "Manual location"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								size: "sm",
								variant: photo ? "default" : "secondary",
								onClick: () => setPhoto(!photo),
								children: photo ? "Photo attached" : "No photo"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "w-full",
						onClick: save,
						children: "Save report"
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "mt-8 text-sm font-medium text-muted",
			children: "On device"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-3 space-y-2",
			children: incidents.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "rounded-lg border border-border bg-surface px-3 py-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium",
							children: i.type
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SyncBadge, { state: i.syncState })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: i.description
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 font-mono text-[11px] text-subtle",
						children: [
							fmtTime(i.observedAt),
							" · ",
							i.locationSource,
							i.hasPhoto ? " · photo" : ""
						]
					})
				]
			}, i.reportId))
		})
	] });
}
//#endregion
export { IncidentsPage as component };
