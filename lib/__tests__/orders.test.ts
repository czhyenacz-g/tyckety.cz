import { describe, it, expect } from "vitest";
import { classifyOrder } from "../orders";

describe("classifyOrder", () => {
  it("tickets_issued → issued", () => {
    expect(classifyOrder({ status: "tickets_issued", payment: null })).toBe("issued");
  });

  it("paid → paid", () => {
    expect(classifyOrder({ status: "paid", payment: null })).toBe("paid");
  });

  it("awaiting_payment → pending", () => {
    expect(classifyOrder({ status: "awaiting_payment", payment: null })).toBe("pending");
  });

  it("payment_window_expired without problematic payment → pending", () => {
    expect(classifyOrder({ status: "payment_window_expired", payment: null })).toBe("pending");
  });

  it("manual_review → problematic", () => {
    expect(classifyOrder({ status: "manual_review", payment: null })).toBe("problematic");
  });

  it("amount_mismatch payment → problematic", () => {
    expect(classifyOrder({ status: "awaiting_payment", payment: { status: "amount_mismatch" } })).toBe("problematic");
  });

  it("unknown_symbol payment → problematic", () => {
    expect(classifyOrder({ status: "awaiting_payment", payment: { status: "unknown_symbol" } })).toBe("problematic");
  });

  it("wrong_account payment → problematic", () => {
    expect(classifyOrder({ status: "awaiting_payment", payment: { status: "wrong_account" } })).toBe("problematic");
  });

  it("missing_symbol payment → problematic", () => {
    expect(classifyOrder({ status: "awaiting_payment", payment: { status: "missing_symbol" } })).toBe("problematic");
  });

  it("matched payment does not override status (awaiting_payment stays pending)", () => {
    expect(classifyOrder({ status: "awaiting_payment", payment: { status: "matched" } })).toBe("pending");
  });

  it("tickets_issued takes priority over problematic payment", () => {
    expect(classifyOrder({ status: "tickets_issued", payment: { status: "amount_mismatch" } })).toBe("issued");
  });
});
