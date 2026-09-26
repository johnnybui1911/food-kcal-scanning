import type { NutritionResult } from "./nutrition-schema";

// Always "." as decimal separator: tracker apps parse it in both locales.
export function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, "");
}

export type CopyLabels = {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sugar: string;
  sodium: string;
};

export function buildCopyAllText(r: NutritionResult, labels: CopyLabels): string {
  return [
    `${r.dish_name} (${r.serving_description})`,
    `${labels.calories}: ${formatNumber(r.calories_kcal)} kcal`,
    `${labels.protein}: ${formatNumber(r.protein_g)} g`,
    `${labels.carbs}: ${formatNumber(r.carbs_g)} g`,
    `${labels.fat}: ${formatNumber(r.fat_g)} g`,
    `${labels.fiber}: ${formatNumber(r.fiber_g)} g`,
    `${labels.sugar}: ${formatNumber(r.sugar_g)} g`,
    `${labels.sodium}: ${formatNumber(r.sodium_mg)} mg`,
  ].join("\n");
}
