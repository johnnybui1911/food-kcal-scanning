import type { NutritionResult } from "../nutrition-schema";

export const sample: NutritionResult = {
  is_food: true,
  dish_name: "Phở bò tái",
  serving_description: "1 tô lớn",
  total_weight_g: 650,
  calories_kcal: 520,
  calories_min_kcal: 450,
  calories_max_kcal: 600,
  confidence: "medium",
  protein_g: 32,
  carbs_g: 62.4,
  fat_g: 14,
  fiber_g: 3,
  sugar_g: 5,
  sodium_mg: 1800,
  ingredients: [
    { name: "Bánh phở", weight_g: 250, calories_kcal: 300, protein_g: 5, carbs_g: 60, fat_g: 1 },
    { name: "Bò tái", weight_g: 100, calories_kcal: 150, protein_g: 25, carbs_g: 0, fat_g: 6 },
  ],
  quality_score: 62,
  quality_reasons: ["Đủ đạm", "Natri cao"],
  notes: "",
};
