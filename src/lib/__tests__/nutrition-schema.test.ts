import { describe, expect, it } from "vitest";
import { NUTRITION_JSON_SCHEMA, NutritionResultSchema, sanitizeResult } from "../nutrition-schema";
import { sample } from "./sample-result";

describe("nutrition schema", () => {
  it("accepts a valid result", () => {
    expect(NutritionResultSchema.parse(sample)).toEqual(sample);
  });

  it("rejects a result missing calories", () => {
    const { calories_kcal, ...rest } = sample;
    expect(NutritionResultSchema.safeParse(rest).success).toBe(false);
  });

  it("JSON schema mirrors the zod shape and requires every key", () => {
    const zodKeys = Object.keys(NutritionResultSchema.shape).sort();
    expect(Object.keys(NUTRITION_JSON_SCHEMA.properties).sort()).toEqual(zodKeys);
    expect([...NUTRITION_JSON_SCHEMA.required].sort()).toEqual(zodKeys);
    expect(NUTRITION_JSON_SCHEMA.additionalProperties).toBe(false);
  });
});

describe("sanitizeResult", () => {
  it("clamps quality score and negative numbers", () => {
    const r = sanitizeResult({ ...sample, quality_score: 140, fat_g: -3 });
    expect(r.quality_score).toBe(100);
    expect(r.fat_g).toBe(0);
  });

  it("orders the calorie range around the estimate", () => {
    const r = sanitizeResult({ ...sample, calories_kcal: 500, calories_min_kcal: 700, calories_max_kcal: 400 });
    expect(r.calories_min_kcal).toBeLessThanOrEqual(r.calories_kcal);
    expect(r.calories_max_kcal).toBeGreaterThanOrEqual(r.calories_kcal);
  });

  it("rounds kcal to integers and grams to one decimal", () => {
    const r = sanitizeResult({ ...sample, calories_kcal: 520.7, protein_g: 32.26 });
    expect(r.calories_kcal).toBe(521);
    expect(r.protein_g).toBe(32.3);
  });
});
