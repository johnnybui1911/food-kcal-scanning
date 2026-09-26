import { API_BASE } from "./config";
import type { Locale } from "./i18n";
import type { NutritionResult } from "./nutrition-schema";
import { getDeviceId } from "./storage";

export type ApiErrorKind = "offline" | "rate_limited" | "not_food" | "ai_failed" | "too_large" | "bad_request" | "generic";
export type ApiResult<T> = { ok: true; data: T } | { ok: false; kind: ApiErrorKind; result?: NutritionResult };
export type ScanResponse = { result: NutritionResult; model: string; prompt_version: string };

const STATUS_KIND: Record<number, ApiErrorKind> = {
  400: "bad_request",
  413: "too_large",
  422: "not_food",
  429: "rate_limited",
  502: "ai_failed",
};

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method: "POST",
      headers: { "content-type": "application/json", "x-device-id": await getDeviceId() },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    return { ok: false, kind: "offline" };
  }
  if (res.status === 204) return { ok: true, data: null as T };
  const data = await res.json().catch(() => null);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  if (res.status === 200 && data) return { ok: true, data: data as T };
  return { ok: false, kind: STATUS_KIND[res.status] ?? "generic", result: data?.result };
}

export function scanFood(
  input: { image_base64: string; media_type: "image/jpeg"; note: string; locale: Locale },
  signal?: AbortSignal,
) {
  return post<ScanResponse>("/api/scan", input, signal);
}

export function refineResult(input: { previous: NutritionResult; correction: string; locale: Locale }, signal?: AbortSignal) {
  return post<ScanResponse>("/api/refine", input, signal);
}

export function sendFeedback(input: {
  rating: "up" | "down";
  reasons: string[];
  comment: string;
  dish_name: string;
  calories_kcal: number;
  quality_score: number;
  model: string;
  prompt_version: string;
  locale: Locale;
}) {
  return post<null>("/api/feedback", input);
}
