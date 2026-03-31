import { describe, expect, it } from "bun:test";
import "../helpers/mockVscode";

const { escapeForRegex, findClosingParen, getQuotedStringRanges } = require(
  "../../core/document",
);

describe("document parsing", () => {
  it("escapes regex special characters", () => {
    const escaped = escapeForRegex("clsx.*(a|b)+$");
    expect(escaped).toBe("clsx\\.\\*\\(a\\|b\\)\\+\\$");
  });

  it("finds matching closing parenthesis while skipping string contents", () => {
    const input = "clsx('p-2)', a && cn(\"m-2\"), `text-sm` )";
    const openIndex = input.indexOf("(");
    const closeIndex = findClosingParen(input, openIndex);

    expect(closeIndex).toBe(input.length - 1);
  });

  it("extracts quoted string ranges and ignores interpolated template literals", () => {
    const argsText = "'p-2 m-2', \"text-sm\", `w-4`, `p-${size}`";
    const ranges = getQuotedStringRanges(argsText, 0);
    const extracted = ranges.map((range: { start: number; end: number }) =>
      argsText.slice(range.start, range.end),
    );

    expect(extracted).toEqual(["p-2 m-2", "text-sm", "w-4"]);
  });
});