import { env } from "cloudflare:workers";

const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:4173",
  "http://localhost:5173",
]);

function configuredWebOrigin() {
  const value = (env as unknown as { KLASSENKOMPASS_WEB_ORIGIN?: unknown })
    .KLASSENKOMPASS_WEB_ORIGIN;
  return typeof value === "string" ? value.trim().replace(/\/$/, "") : "";
}

export function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const headers = new Headers({ Vary: "Origin" });
  const webOrigin = configuredWebOrigin();

  if (origin && (allowedOrigins.has(origin) || origin === webOrigin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  }

  return headers;
}

export function jsonResponse(
  request: Request,
  body: unknown,
  init: ResponseInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  corsHeaders(request).forEach((value, key) => headers.set(key, value));
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function optionsResponse(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
