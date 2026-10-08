import { createFileRoute } from "@tanstack/react-router";
import {
  corsHeaders,
  fieldHealthPayload,
  jsonResponse,
} from "@/lib/domain/field-sync-http";

export const Route = createFileRoute("/api/v1/health")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, {
          status: 204,
          headers: corsHeaders(request.headers.get("origin")),
        }),
      GET: async ({ request }) => {
        try {
          const body = await fieldHealthPayload();
          return jsonResponse(body, { origin: request.headers.get("origin") });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return jsonResponse(
            { app: "TrailGuard", status: "error", message },
            { status: 500, origin: request.headers.get("origin") },
          );
        }
      },
    },
  },
});
