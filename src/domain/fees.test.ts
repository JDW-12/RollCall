import { describe, expect, it } from "vitest";
import { cardTotal, feeFor } from "./fees";

describe("fees", () => {
  it("is 2.5% plus 20p by default, rounded to the penny", () => {
    expect(feeFor(650)).toBe(36);
    expect(feeFor(6500)).toBe(183);
    expect(feeFor(100)).toBe(23);
    expect(feeFor(0)).toBe(0);
  });
  it("totals the share and the fee", () => {
    expect(cardTotal(650)).toEqual({ share: 650, fee: 36, total: 686 });
  });
  it("takes a custom config", () => {
    expect(feeFor(1000, { bps: 0, fixedPence: 0 })).toBe(0);
  });
});
