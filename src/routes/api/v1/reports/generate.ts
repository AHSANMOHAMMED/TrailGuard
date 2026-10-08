import { createFileRoute } from "@tanstack/react-router";
import { listFieldCounts } from "@/lib/domain/conservation-api.server";
import { corsHeaders, jsonResponse } from "@/lib/domain/field-sync-http";

/** Lightweight conservation snapshot for phones (shared DB counts + window). */
export const Route = createFileRoute("/api/v1/reports/generate")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, {
          status: 204,
          headers: corsHeaders(request.headers.get("origin")),
        }),
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        try {
          const body = (await request.json().catch(() => ({}))) as {
            park_id?: string;
            date_from?: string;
            date_to?: string;
          };
          const counts = await listFieldCounts();
          return jsonResponse(
            {
              park_id: body.park_id ?? "shared",
              date_from: body.date_from ?? null,
              date_to: body.date_to ?? null,
              generated_at: new Date().toISOString(),
              source: "shared-field-db",
              totals: counts,
            },
            { origin },
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return jsonResponse({ error: message }, { status: 500, origin });
        }
      },
    },
  },
});
