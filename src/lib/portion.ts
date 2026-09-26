import { sanitizeResult, type NutritionResult } from "./nutrition-schema";

export function scaleResult(r: NutritionResult, m: number): NutritionResult {
  return sanitizeResult({
    ...r,
    total_weight_g: r.total_weight_g * m,
    calories_kcal: r.calories_kcal * m,
    calories_min_kcal: r.calories_min_kcal * m,
    calories_max_kcal: r.calories_max_kcal * m,
    protein_g: r.protein_g * m,
    carbs_g: r.carbs_g * m,
    fat_g: r.fat_g * m,
    fiber_g: r.fiber_g * m,
    sugar_g: r.sugar_g * m,
    sodium_mg: r.sodium_mg * m,
    ingredients: r.ingredients.map((i) => ({
      ...i,
      weight_g: i.weight_g * m,
      calories_kcal: i.calories_kcal * m,
      protein_g: i.protein_g * m,
      carbs_g: i.carbs_g * m,
      fat_g: i.fat_g * m,
    })),
  });
}
