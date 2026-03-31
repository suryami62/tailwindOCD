import { describe, expect, it } from "bun:test";

const { cleanClassList } = require("../../core/tailwind");

describe("tailwind cleaner", () => {
  it("removes duplicate classes by keeping the last occurrence", () => {
    const result = cleanClassList(
      "px-2 px-4 px-2 text-sm",
      true,
      false,
    );
    expect(result).toBe("px-4 px-2 text-sm");
  });

  it("removes simple conflicting utilities by keeping the last one", () => {
    const result = cleanClassList("p-2 md:p-4 p-6", false, true);
    expect(result).toBe("md:p-4 p-6");
  });

  it("handles both duplicate and conflict cleanup together", () => {
    const result = cleanClassList(
      "p-2 p-2 p-4 m-2 m-4 m-4",
      true,
      true,
    );
    expect(result).toBe("p-4 m-4");
  });

  it("keeps non-conflicting spacing axes together", () => {
    const result = cleanClassList("px-4 py-2", false, true);
    expect(result).toBe("px-4 py-2");
  });

  it("preserves whitespace normalization when cleanup is disabled", () => {
    const result = cleanClassList("  px-4 py-2  ", false, false);
    expect(result).toBe("px-4 py-2");
  });
});