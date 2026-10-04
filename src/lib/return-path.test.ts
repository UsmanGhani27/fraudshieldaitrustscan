import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./return-path";

describe("safeReturnPath", () => {
  it("allows in-app paths", () => expect(safeReturnPath("/history?sort=old")).toBe("/history?sort=old"));
  it("rejects external and protocol-relative URLs", () => {
    expect(safeReturnPath("https://evil.example")).toBeUndefined();
    expect(safeReturnPath("//evil.example")).toBeUndefined();
    expect(safeReturnPath("/\\evil.example")).toBeUndefined();
    expect(safeReturnPath("javascript:alert(1)")).toBeUndefined();
  });
  it("avoids auth-page loops", () => expect(safeReturnPath("/auth")).toBeUndefined());
});
