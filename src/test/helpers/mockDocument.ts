import type { ComparablePositionLike } from "./mockVscode";
import "./mockVscode";

export function createMockDocument(text: string) {
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

  function offsetAt(position: ComparablePositionLike) {
    const lineOffset = lineOffsets[position.line] ?? text.length;
    return Math.max(0, Math.min(lineOffset + position.character, text.length));
  }

  return {
    getText: () => text,
    lineAt: (lineNumber: number) => ({ text: lines[lineNumber] ?? "" }),
    positionAt,
    offsetAt,
  };
}

export function getSelectionTexts(
  document: ReturnType<typeof createMockDocument>,
  selections: Array<{ start: ComparablePositionLike; end: ComparablePositionLike }>,
) {
  const text = document.getText();
  return selections.map((selection) => {
    const startOffset = document.offsetAt(selection.start);
    const endOffset = document.offsetAt(selection.end);
    return text.slice(startOffset, endOffset);
  });
}