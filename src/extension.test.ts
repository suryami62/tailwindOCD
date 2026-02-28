import { describe, expect, it, mock } from "bun:test";

type ComparablePositionLike = {
  line: number;
  character: number;
};

mock.module("vscode", () => ({
  Selection: class {
    constructor(public start: unknown, public end: unknown) { }
  },
  Position: class {
    constructor(public line: number, public character: number) { }

    compareTo(other: ComparablePositionLike) {
      if (this.line !== other.line) return this.line - other.line;
      return this.character - other.character;
    }
  },
}));

const { escapeForRegex, findClosingParen, getQuotedStringRanges, getClassSelections } = require(
  "./util/document"
);
const { cleanClassList, getClassConflictKey } = require("./util/tailwind");

function createMockDocument(text: string) {
  const { Position } = require("vscode");
  const lines = text.split("\n");
  const lineOffsets: number[] = [];
  let offset = 0;

  for (const line of lines) {
    lineOffsets.push(offset);
    offset += line.length + 1;
  }

  function positionAt(targetOffset: number) {
    const boundedOffset = Math.max(0, Math.min(targetOffset, text.length));

    let line = 0;
    while (
      line + 1 < lineOffsets.length &&
      lineOffsets[line + 1] <= boundedOffset
    ) {
      line += 1;
    }

    return new Position(line, boundedOffset - lineOffsets[line]);
  }

  return {
    getText: () => text,
    lineAt: (lineNumber: number) => ({ text: lines[lineNumber] ?? "" }),
    positionAt,
  };
}

describe("extension helper functions", () => {
  it("escapes regex special characters", () => {
    const escaped = escapeForRegex("clsx.*(a|b)+$");
    expect(escaped).toBe("clsx\\.\\*\\(a\\|b\\)\\+\\$");
  });

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

  it("finds matching closing parenthesis while skipping string contents", () => {
    const input = "clsx('p-2)', a && cn(\"m-2\"), `text-sm` )";
    const openIndex = input.indexOf("(");
    const closeIndex = findClosingParen(input, openIndex);

    expect(closeIndex).toBe(input.length - 1);
  });

  it("extracts quoted string ranges and ignores interpolated template literals", () => {
    const argsText = "'p-2 m-2', \"text-sm\", `w-4`, `p-${size}`";
    const ranges = getQuotedStringRanges(argsText, 0);
    const extracted = ranges.map((range: { start: number; end: number }) => argsText.slice(range.start, range.end));

    expect(extracted).toEqual(["p-2 m-2", "text-sm", "w-4"]);
  });

  it("ignores multiline class attribute when marker exists on later line", () => {
    const text = `<div className=\"p-2\nm-2\" /> // tailwindocd-ignore`;
    const document = createMockDocument(text);

    const selections = getClassSelections(document, {
      dynamicClassFunctions: ["clsx", "cn", "classnames"],
      ignoreCommentMarker: "tailwindocd-ignore",
    });

    expect(selections).toHaveLength(0);
  });

  it("still captures multiline class attribute without ignore marker", () => {
    const text = `<div className=\"p-2\nm-2\" />`;
    const document = createMockDocument(text);

    const selections = getClassSelections(document, {
      dynamicClassFunctions: ["clsx", "cn", "classnames"],
      ignoreCommentMarker: "tailwindocd-ignore",
    });

    expect(selections).toHaveLength(1);
  });
});
