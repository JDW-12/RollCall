import { describe, expect, it } from "vitest";
import { safeNext } from "./redirects";

describe("safeNext", () => {
  it("only allows same-site paths", () => {
    expect(safeNext("/crew/tuesday-fc")).toBe("/crew/tuesday-fc");
    expect(safeNext("//evil.com")).toBe("/home");
    expect(safeNext("/\\evil.com")).toBe("/home");
    expect(safeNext("https://evil.com")).toBe("/home");
    expect(safeNext(undefined)).toBe("/home");
  });
});
