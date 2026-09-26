import { describe, expect, it } from "vitest";
import { sample } from "../../src/lib/__tests__/sample-result";
import { isDeviceId, parseFeedbackBody, parseRefineBody, parseScanBody } from "../validate";

const img = "a".repeat(200);

describe("parseScanBody", () => {
  it("accepts a valid body and trims the note", () => {
    const r = parseScanBody({ image_base64: img, media_type: "image/jpeg", note: "  phở  ", locale: "vi" });
    expect(r).toEqual({ ok: true, value: { image_base64: img, media_type: "image/jpeg", note: "phở", locale: "vi" } });
  });
  it("rejects a missing locale", () => {
    expect(parseScanBody({ image_base64: img, media_type: "image/jpeg" })).toEqual({ ok: false, error: "bad_request" });
  });
  it("rejects an unsupported media type", () => {
    expect(parseScanBody({ image_base64: img, media_type: "image/gif", locale: "en" }).ok).toBe(false);
  });
  it("flags an oversized image", () => {
    const r = parseScanBody({ image_base64: "a".repeat(1_500_001), media_type: "image/jpeg", locale: "en" });
    expect(r).toEqual({ ok: false, error: "image_too_large" });
  });
  it("rejects a note over 200 chars", () => {
    expect(parseScanBody({ image_base64: img, media_type: "image/jpeg", locale: "en", note: "x".repeat(201) }).ok).toBe(false);
  });
});

describe("parseRefineBody", () => {
  it("accepts a valid body", () => {
    expect(parseRefineBody({ previous: sample, correction: "ít bánh hơn", locale: "vi" }).ok).toBe(true);
  });
  it("rejects an empty correction", () => {
    expect(parseRefineBody({ previous: sample, correction: "   ", locale: "vi" }).ok).toBe(false);
  });
  it("rejects a previous result missing calories", () => {
    const { calories_kcal, ...rest } = sample;
    expect(parseRefineBody({ previous: rest, correction: "x", locale: "vi" }).ok).toBe(false);
  });
});

describe("parseFeedbackBody", () => {
  it("filters unknown reasons and truncates the comment", () => {
    const r = parseFeedbackBody({ rating: "down", reasons: ["portion_off", "hack"], comment: "c".repeat(600), locale: "en" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.reasons).toEqual(["portion_off"]);
      expect(r.value.comment).toHaveLength(500);
    }
  });
  it("rejects an invalid rating", () => {
    expect(parseFeedbackBody({ rating: "meh", reasons: [], locale: "en" }).ok).toBe(false);
  });
});

describe("isDeviceId", () => {
  it("validates format", () => {
    expect(isDeviceId("abc")).toBe(false);
    expect(isDeviceId(null)).toBe(false);
    expect(isDeviceId("3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b")).toBe(true);
  });
});
