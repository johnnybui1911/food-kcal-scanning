export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extraHeaders },
  });
}

// CORS is only needed in local dev, where the Expo dev server runs on another origin.
export function corsHeaders(request: Request, env: Env): Record<string, string> {
  // Set only in .dev.vars, so generated Env types include it only when that line exists.
  const devOrigin = (env as { ALLOWED_DEV_ORIGIN?: string }).ALLOWED_DEV_ORIGIN;
  const origin = request.headers.get("origin");
  if (!devOrigin || origin !== devOrigin) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "content-type, x-device-id",
    "access-control-allow-methods": "GET, POST, OPTIONS",
  };
}
