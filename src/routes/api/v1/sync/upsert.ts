import { createFileRoute } from "@tanstack/react-router";
import {
  corsHeaders,
  handleMobileUpsert,
  jsonResponse,
} from "@/lib/domain/field-sync-http";

/**
 * Shared Field Sync entry for every phone (and the web client if needed).
 * POST { kind, payload } → idempotent UUID upsert into the single shared DB.
 */
export const Route = createFileRoute("/api/v1/sync/upsert")({
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
          const body = (await request.json()) as {
            kind?: string;
            payload?: unknown;
          };
          if (!body?.kind || typeof body.kind !== "string") {
            return jsonResponse(
              { error: "kind required" },
              { status: 400, origin },
            );
          }
          const ack = await handleMobileUpsert(body.kind, body.payload);
          if (!ack.complete && body.kind === "incident") {
            return jsonResponse(ack, { status: 409, origin });
          }
          return jsonResponse(ack, { origin });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const status = message.startsWith("Unknown kind") ? 400 : 500;
          return jsonResponse({ error: message }, { status, origin });
        }
      },
    },
  },
});
