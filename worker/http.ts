export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extraHeaders },
  });
}

// CORS is only needed in local dev, where the Expo dev server runs on another origin.
export function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!env.ALLOWED_DEV_ORIGIN || origin !== env.ALLOWED_DEV_ORIGIN) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "content-type, x-device-id",
    "access-control-allow-methods": "GET, POST, OPTIONS",
  };
}
