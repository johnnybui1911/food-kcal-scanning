import { describe, expect, it } from "vitest";
import { scaleResult } from "../portion";
import { sample } from "./sample-result";

describe("scaleResult", () => {
  it("doubles totals and ingredients", () => {
    const r = scaleResult(sample, 2);
    expect(r.calories_kcal).toBe(sample.calories_kcal * 2);
    expect(r.protein_g).toBe(sample.protein_g * 2);
    expect(r.ingredients[0].calories_kcal).toBe(sample.ingredients[0].calories_kcal * 2);
  });

  it("halves and keeps non-numeric fields", () => {
    const r = scaleResult(sample, 0.5);
    expect(r.calories_kcal).toBe(260);
    expect(r.quality_score).toBe(sample.quality_score);
    expect(r.dish_name).toBe(sample.dish_name);
  });
});
