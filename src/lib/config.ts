export const APP_NAME = "Calobi";
// Empty string = same origin (production). In dev set EXPO_PUBLIC_API_BASE=http://localhost:8787
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? "";
export const HISTORY_LIMIT = 50;
export const PORTION_OPTIONS = [0.5, 1, 1.5, 2] as const;
export const NOTE_MAX = 200;
export const CORRECTION_MAX = 300;
export const COMMENT_MAX = 500;
export const IMAGE_MAX_SIDE = 1024;
export const IMAGE_JPEG_QUALITY = 0.6;
export const THUMB_SIDE = 160;
export const FEEDBACK_REASONS = [
  "wrong_dish",
  "portion_off",
  "missing_ingredient",
  "nutrients_off",
  "other",
] as const;
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];
