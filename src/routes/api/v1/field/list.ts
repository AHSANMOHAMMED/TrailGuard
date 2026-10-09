import { createFileRoute } from "@tanstack/react-router";
import { listSharedFieldRecords } from "@/lib/domain/conservation-api.server";
import { corsHeaders, jsonResponse } from "@/lib/domain/field-sync-http";

/** GET shared field rows (phones + tools) from the one park DB. */
export const Route = createFileRoute("/api/v1/field/list")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, {
          status: 204,
          headers: corsHeaders(request.headers.get("origin")),
        }),
      GET: async ({ request }) => {
        const origin = request.headers.get("origin");
        try {
          const data = await listSharedFieldRecords();
          return jsonResponse({ shared: true, ...data }, { origin });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return jsonResponse({ error: message }, { status: 500, origin });
        }
      },
    },
  },
});
