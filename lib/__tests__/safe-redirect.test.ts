import { describe, it, expect } from "vitest";
import { safeNext } from "../safe-redirect";

describe("safeNext", () => {
  it("allows /app path", () => {
    expect(safeNext("/app")).toBe("/app");
  });

  it("allows /internal path", () => {
    expect(safeNext("/internal")).toBe("/internal");
  });

  it("allows /app/akce path", () => {
    expect(safeNext("/app/akce/123")).toBe("/app/akce/123");
  });

  it("rejects https://evil.com → fallback /app", () => {
    expect(safeNext("https://evil.com")).toBe("/app");
  });

  it("rejects //evil.com (protocol-relative) → fallback /app", () => {
    expect(safeNext("//evil.com")).toBe("/app");
  });

  it("rejects null → fallback /app", () => {
    expect(safeNext(null)).toBe("/app");
  });

  it("rejects empty string → fallback /app", () => {
    expect(safeNext("")).toBe("/app");
  });

  it("rejects relative path without leading slash → fallback /app", () => {
    expect(safeNext("evil.com/steal")).toBe("/app");
  });
});
