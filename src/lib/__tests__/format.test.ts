import { describe, expect, it } from "vitest";
import { buildCopyAllText, formatNumber } from "../format";
import { sample } from "./sample-result";

const labels = { calories: "Calories", protein: "Protein", carbs: "Carbs", fat: "Fat", fiber: "Fiber", sugar: "Sugar", sodium: "Sodium" };

describe("formatNumber", () => {
  it("formats integers and one decimal", () => {
    expect(formatNumber(12)).toBe("12");
    expect(formatNumber(12.345)).toBe("12.3");
    expect(formatNumber(12.04)).toBe("12");
  });
});

describe("buildCopyAllText", () => {
  it("includes the dish and every nutrient line", () => {
    const text = buildCopyAllText(sample, labels);
    expect(text).toContain("Phở bò tái (1 tô lớn)");
    expect(text).toContain("Calories: 520 kcal");
    expect(text).toContain("Carbs: 62.4 g");
    expect(text).toContain("Sodium: 1800 mg");
    expect(text.split("\n")).toHaveLength(8);
  });
});
