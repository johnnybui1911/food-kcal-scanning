import type Anthropic from "@anthropic-ai/sdk";
import { estimate } from "./claude";
import { corsHeaders, json } from "./http";
import { buildRefineSystem, buildRefineUserText, buildScanSystem, buildScanUserText, PROMPT_VERSION } from "./prompt";
import { checkDailyQuota } from "./quota";
import { IMAGE_BASE64_MAX, isDeviceId, parseFeedbackBody, parseRefineBody, parseScanBody } from "./validate";

export { QuotaCounter } from "./quota";

async function handleApi(request: Request, env: Env, path: string): Promise<Response> {
  if (request.method === "GET" && path === "/api/health") return json({ ok: true });

  const route = path.replace("/api/", "");
  if (request.method !== "POST" || !["scan", "refine", "feedback"].includes(route)) {
    return json({ error: "not_found" }, 404);
  }

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const deviceId = request.headers.get("x-device-id");
  if (!isDeviceId(deviceId)) return json({ error: "bad_request" }, 400);

  // Keyed by device, not IP: Vietnamese mobile carriers put many users behind one IP (CGNAT).
  const burst = await env.BURST_LIMITER.limit({ key: `d:${deviceId}` });
  if (!burst.success) return json({ error: "rate_limited", scope: "burst" }, 429);

  // Reject oversized bodies before parsing: JSON-parsing megabytes can exceed the Workers CPU limit.
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > IMAGE_BASE64_MAX + 4096) return json({ error: "image_too_large" }, 413);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  if (route === "feedback") {
    const parsed = parseFeedbackBody(body);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const f = parsed.value;
    try {
      env.FEEDBACK?.writeDataPoint({
        indexes: [deviceId],
        blobs: [f.rating, f.reasons.join(","), f.comment, f.dish_name, f.model, f.prompt_version, f.locale],
        doubles: [f.calories_kcal, f.quality_score],
      });
    } catch (e) {
      console.log(JSON.stringify({ evt: "feedback_write_failed", error: String(e) }));
    }
    console.log(JSON.stringify({ evt: "feedback", ...f, deviceId }));
    return new Response(null, { status: 204 });
  }

  let system: string;
  let content: Anthropic.MessageParam["content"];
  if (route === "scan") {
    const parsed = parseScanBody(body);
    if (!parsed.ok) return json({ error: parsed.error }, parsed.error === "image_too_large" ? 413 : 400);
    const { image_base64, media_type, note, locale } = parsed.value;
    system = buildScanSystem(locale);
    content = [
      { type: "image", source: { type: "base64", media_type, data: image_base64 } },
      { type: "text", text: buildScanUserText(note, locale) },
    ];
  } else {
    const parsed = parseRefineBody(body);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const { previous, correction, locale } = parsed.value;
    system = buildRefineSystem(locale);
    content = [{ type: "text", text: buildRefineUserText(JSON.stringify(previous), correction, locale) }];
  }

  const scope = await checkDailyQuota(env, deviceId, ip);
  if (scope) return json({ error: "rate_limited", scope }, 429);

  try {
    const { result, model } = await estimate(env, system, content);
    if (!result.is_food) return json({ error: "not_food", result }, 422);
    return json({ result, model, prompt_version: PROMPT_VERSION });
  } catch (e) {
    console.log(JSON.stringify({ evt: "ai_failed", route, error: String((e as Error).cause ?? e) }));
    return json({ error: "ai_failed" }, 502);
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const res = await handleApi(request, env, url.pathname);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
} satisfies ExportedHandler<Env>;
