import { z } from "zod";

// Shared by the app and the Worker. NUTRITION_JSON_SCHEMA must mirror NutritionResultSchema
// key-for-key; a unit test enforces it.

export const ConfidenceSchema = z.enum(["low", "medium", "high"]);

export const IngredientSchema = z.object({
  name: z.string(),
  weight_g: z.number(),
  calories_kcal: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
});

export const NutritionResultSchema = z.object({
  is_food: z.boolean(),
  dish_name: z.string(),
  serving_description: z.string(),
  total_weight_g: z.number(),
  calories_kcal: z.number(),
  calories_min_kcal: z.number(),
  calories_max_kcal: z.number(),
  confidence: ConfidenceSchema,
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  fiber_g: z.number(),
  sugar_g: z.number(),
  sodium_mg: z.number(),
  ingredients: z.array(IngredientSchema),
  quality_score: z.number(),
  quality_reasons: z.array(z.string()),
  notes: z.string(),
});

export type Confidence = z.infer<typeof ConfidenceSchema>;
export type Ingredient = z.infer<typeof IngredientSchema>;
export type NutritionResult = z.infer<typeof NutritionResultSchema>;

const num = { type: "number" } as const;
const str = { type: "string" } as const;

const INGREDIENT_PROPERTIES = {
  name: str,
  weight_g: num,
  calories_kcal: num,
  protein_g: num,
  carbs_g: num,
  fat_g: num,
};

const RESULT_PROPERTIES = {
  is_food: { type: "boolean" },
  dish_name: str,
  serving_description: str,
  total_weight_g: num,
  calories_kcal: num,
  calories_min_kcal: num,
  calories_max_kcal: num,
  confidence: { type: "string", enum: ["low", "medium", "high"] },
  protein_g: num,
  carbs_g: num,
  fat_g: num,
  fiber_g: num,
  sugar_g: num,
  sodium_mg: num,
  ingredients: {
    type: "array",
    items: {
      type: "object",
      properties: INGREDIENT_PROPERTIES,
      required: Object.keys(INGREDIENT_PROPERTIES),
      additionalProperties: false,
    },
  },
  quality_score: num,
  quality_reasons: { type: "array", items: str },
  notes: str,
};

// No minimum/maximum/minLength: structured outputs reject numeric and string constraints.
export const NUTRITION_JSON_SCHEMA = {
  type: "object",
  properties: RESULT_PROPERTIES,
  required: Object.keys(RESULT_PROPERTIES),
  additionalProperties: false,
} as const;

const nonNeg = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
const int = (n: number) => Math.round(nonNeg(n));
const oneDecimal = (n: number) => Math.round(nonNeg(n) * 10) / 10;

export function sanitizeResult(r: NutritionResult): NutritionResult {
  const kcal = int(r.calories_kcal);
  const lo = int(Math.min(r.calories_min_kcal, r.calories_max_kcal));
  const hi = int(Math.max(r.calories_min_kcal, r.calories_max_kcal));
  return {
    ...r,
    total_weight_g: oneDecimal(r.total_weight_g),
    calories_kcal: kcal,
    calories_min_kcal: Math.min(lo, kcal),
    calories_max_kcal: Math.max(hi, kcal),
    protein_g: oneDecimal(r.protein_g),
    carbs_g: oneDecimal(r.carbs_g),
    fat_g: oneDecimal(r.fat_g),
    fiber_g: oneDecimal(r.fiber_g),
    sugar_g: oneDecimal(r.sugar_g),
    sodium_mg: int(r.sodium_mg),
    quality_score: Math.min(100, int(r.quality_score)),
    ingredients: r.ingredients.map((i) => ({
      ...i,
      weight_g: oneDecimal(i.weight_g),
      calories_kcal: int(i.calories_kcal),
      protein_g: oneDecimal(i.protein_g),
      carbs_g: oneDecimal(i.carbs_g),
      fat_g: oneDecimal(i.fat_g),
    })),
  };
}
