import { NutritionResultSchema, type NutritionResult } from "../src/lib/nutrition-schema";

export type Locale = "vi" | "en";
export type MediaType = "image/jpeg" | "image/png" | "image/webp";
type Fail = { ok: false; error: "bad_request" | "image_too_large" };
type Ok<T> = { ok: true; value: T };

export const IMAGE_BASE64_MAX = 1_500_000;
const MEDIA_TYPES: MediaType[] = ["image/jpeg", "image/png", "image/webp"];
const REASONS = ["wrong_dish", "portion_off", "missing_ingredient", "nutrients_off", "other"];

const bad: Fail = { ok: false, error: "bad_request" };
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isLocale = (x: unknown): x is Locale => x === "vi" || x === "en";
const optString = (x: unknown): string | null => (x === undefined || x === null ? "" : typeof x === "string" ? x.trim() : null);

export function isDeviceId(s: string | null): s is string {
  return typeof s === "string" && /^[A-Za-z0-9-]{16,64}$/.test(s);
}

export type ScanBody = { image_base64: string; media_type: MediaType; note: string; locale: Locale };

export function parseScanBody(x: unknown): Ok<ScanBody> | Fail {
  if (!isObj(x) || typeof x.image_base64 !== "string" || !isLocale(x.locale)) return bad;
  if (!MEDIA_TYPES.includes(x.media_type as MediaType)) return bad;
  if (x.image_base64.length > IMAGE_BASE64_MAX) return { ok: false, error: "image_too_large" };
  if (x.image_base64.length < 100) return bad;
  const note = optString(x.note);
  if (note === null || note.length > 200) return bad;
  return { ok: true, value: { image_base64: x.image_base64, media_type: x.media_type as MediaType, note, locale: x.locale } };
}

export type RefineBody = { previous: NutritionResult; correction: string; locale: Locale };

export function parseRefineBody(x: unknown): Ok<RefineBody> | Fail {
  if (!isObj(x) || !isLocale(x.locale) || typeof x.correction !== "string") return bad;
  const correction = x.correction.trim();
  if (correction.length < 1 || correction.length > 300) return bad;
  const previous = NutritionResultSchema.safeParse(x.previous);
  if (!previous.success) return bad;
  return { ok: true, value: { previous: previous.data, correction, locale: x.locale } };
}

export type FeedbackBody = {
  rating: "up" | "down";
  reasons: string[];
  comment: string;
  dish_name: string;
  calories_kcal: number;
  quality_score: number;
  model: string;
  prompt_version: string;
  locale: Locale;
};

export function parseFeedbackBody(x: unknown): Ok<FeedbackBody> | Fail {
  if (!isObj(x) || (x.rating !== "up" && x.rating !== "down") || !isLocale(x.locale)) return bad;
  if (!Array.isArray(x.reasons)) return bad;
  const comment = optString(x.comment);
  if (comment === null) return bad;
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 200) : "");
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return {
    ok: true,
    value: {
      rating: x.rating,
      reasons: x.reasons.filter((r): r is string => typeof r === "string" && REASONS.includes(r)),
      comment: comment.slice(0, 500),
      dish_name: str(x.dish_name),
      calories_kcal: num(x.calories_kcal),
      quality_score: num(x.quality_score),
      model: str(x.model),
      prompt_version: str(x.prompt_version),
      locale: x.locale,
    },
  };
}
