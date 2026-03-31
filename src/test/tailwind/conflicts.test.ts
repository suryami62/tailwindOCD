import { describe, expect, it } from "bun:test";

const { getClassConflictKey } = require("../../core/tailwind");

describe("tailwind conflicts", () => {
  it("builds conflict key with variants and utility group", () => {
    expect(getClassConflictKey("p-2")).toBe("|p-all");
    expect(getClassConflictKey("md:hover:!p-4")).toBe(
      "md:hover|p-all",
    );
    expect(getClassConflictKey("hover:[&>*]:p-4")).toBe(
      "hover:[&>*]|p-all",
    );
    expect(getClassConflictKey("px-4")).toBe("|p-x");
    expect(getClassConflictKey("py-2")).toBe("|p-y");
  });

  it("returns null for utility that does not belong to conflict groups", () => {
    expect(getClassConflictKey("bg-red-500")).toBeNull();
  });
});