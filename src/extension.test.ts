import { describe, expect, it, mock } from "bun:test";

mock.module("vscode", () => ({}));

const { __test__ } = await import("./extension");

describe("extension helper functions", () => {
  it("escapes regex special characters", () => {
    const escaped = __test__.escapeForRegex("clsx.*(a|b)+$");
    expect(escaped).toBe("clsx\\.\\*\\(a\\|b\\)\\+\\$");
  });

  it("builds conflict key with variants and utility group", () => {
    expect(__test__.getClassConflictKey("p-2")).toBe("|padding");
    expect(__test__.getClassConflictKey("md:hover:!p-4")).toBe(
      "md:hover|padding",
    );
    expect(__test__.getClassConflictKey("hover:[&>*]:p-4")).toBe(
      "hover:[&>*]|padding",
    );
  });

  it("returns null for utility that does not belong to conflict groups", () => {
    expect(__test__.getClassConflictKey("bg-red-500")).toBeNull();
  });

  it("removes duplicate classes by keeping the last occurrence", () => {
    const result = __test__.cleanClassList(
      "px-2 px-4 px-2 text-sm",
      true,
      false,
    );
    expect(result).toBe("px-4 px-2 text-sm");
  });

  it("removes simple conflicting utilities by keeping the last one", () => {
    const result = __test__.cleanClassList("p-2 md:p-4 p-6", false, true);
    expect(result).toBe("md:p-4 p-6");
  });

  it("handles both duplicate and conflict cleanup together", () => {
    const result = __test__.cleanClassList(
      "p-2 p-2 p-4 m-2 m-4 m-4",
      true,
      true,
    );
    expect(result).toBe("p-4 m-4");
  });

  it("finds matching closing parenthesis while skipping string contents", () => {
    const input = "clsx('p-2)', a && cn(\"m-2\"), `text-sm` )";
    const openIndex = input.indexOf("(");
    const closeIndex = __test__.findClosingParen(input, openIndex);

    expect(closeIndex).toBe(input.length - 1);
  });

  it("extracts quoted string ranges and ignores interpolated template literals", () => {
    const argsText = "'p-2 m-2', \"text-sm\", `w-4`, `p-${size}`";
    const ranges = __test__.getQuotedStringRanges(argsText, 0);
    const extracted = ranges.map((range: { start: number; end: number }) =>
      argsText.slice(range.start, range.end),
    );

    expect(extracted).toEqual(["p-2 m-2", "text-sm", "w-4"]);
  });
});
