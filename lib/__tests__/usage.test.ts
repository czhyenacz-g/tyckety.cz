import { describe, it, expect } from "vitest";
import {
  getUsageThresholdState,
  FREE_TICKET_LIMIT,
  SUPPORT_HINT_TICKET_COUNT,
  NEARING_TICKET_COUNT,
} from "../usage";

describe("getUsageThresholdState", () => {
  it("0 → ok", () => expect(getUsageThresholdState(0)).toBe("ok"));
  it("199 → ok", () => expect(getUsageThresholdState(199)).toBe("ok"));
  it("200 → support_hint", () => expect(getUsageThresholdState(200)).toBe("support_hint"));
  it("499 → support_hint", () => expect(getUsageThresholdState(499)).toBe("support_hint"));
  it("500 → nearing", () => expect(getUsageThresholdState(500)).toBe("nearing"));
  it("665 → nearing", () => expect(getUsageThresholdState(665)).toBe("nearing"));
  it("666 → exceeded", () => expect(getUsageThresholdState(666)).toBe("exceeded"));
  it("1000 → exceeded", () => expect(getUsageThresholdState(1000)).toBe("exceeded"));

  it("constants have correct values", () => {
    expect(SUPPORT_HINT_TICKET_COUNT).toBe(200);
    expect(NEARING_TICKET_COUNT).toBe(500);
    expect(FREE_TICKET_LIMIT).toBe(666);
  });
});
