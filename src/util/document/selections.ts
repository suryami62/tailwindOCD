import * as vscode from "vscode";
import { CLASS_ATTRIBUTE_REGEX, ClassSelectionOptions } from "../constants";
import {
  escapeForRegex,
  findClosingParen,
  getQuotedStringRanges,
} from "./parsing";

function buildSelectionKey(start: vscode.Position, end: vscode.Position): string {
  return `${start.line}:${start.character}-${end.line}:${end.character}`;
}

export function shouldIgnoreLine(
  document: vscode.TextDocument,
  lineNumber: number,
  ignoreCommentMarker: string,
): boolean {
  if (!ignoreCommentMarker.trim()) return false;
  const lineText = document.lineAt(lineNumber).text;
  return lineText.includes(ignoreCommentMarker);
}

function shouldIgnoreSelection(
  document: vscode.TextDocument,
  start: vscode.Position,
  end: vscode.Position,
  ignoreCommentMarker: string,
): boolean {
  for (let line = start.line; line <= end.line; line += 1) {
    if (shouldIgnoreLine(document, line, ignoreCommentMarker)) {
      return true;
    }
  }

  return false;
}

export function getClassSelections(
  document: vscode.TextDocument,
  options: ClassSelectionOptions,
): vscode.Selection[] {
  const text = document.getText();
  const selections: vscode.Selection[] = [];
  const seenKeys = new Set<string>();

  function addSelection(startOffset: number, endOffset: number): void {
    if (endOffset <= startOffset) return;

    const start = document.positionAt(startOffset);
    const end = document.positionAt(endOffset);
    if (
      shouldIgnoreSelection(
        document,
        start,
        end,
        options.ignoreCommentMarker,
      )
    ) {
      return;
    }

    const selectionKey = buildSelectionKey(start, end);
    if (seenKeys.has(selectionKey)) return;

    seenKeys.add(selectionKey);
    selections.push(new vscode.Selection(start, end));
  }

  let match: RegExpExecArray | null;

  while ((match = CLASS_ATTRIBUTE_REGEX.exec(text)) !== null) {
    const classValue = match[1] ?? match[2] ?? match[3];
    if (!classValue || !classValue.trim()) continue;

    const classValueOffset = match.index + match[0].indexOf(classValue);
    addSelection(classValueOffset, classValueOffset + classValue.length);
  }

  const escapedDynamicFunctionNames = options.dynamicClassFunctions
    .map((name) => name.trim())
    .filter(Boolean)
    .map(escapeForRegex);

  if (escapedDynamicFunctionNames.length > 0) {
    const dynamicCallRegex = new RegExp(
      `\\b(?:${escapedDynamicFunctionNames.join("|")})\\s*\\(`,
      "g",
    );

    while ((match = dynamicCallRegex.exec(text)) !== null) {
      const openParenIndex = match.index + match[0].lastIndexOf("(");
      const closeParenIndex = findClosingParen(text, openParenIndex);
      if (closeParenIndex < 0) continue;

      const argsStart = openParenIndex + 1;
      const argsText = text.slice(argsStart, closeParenIndex);
      const quotedRanges = getQuotedStringRanges(argsText, argsStart);

      for (const quotedRange of quotedRanges) {
        const classValue = text.slice(quotedRange.start, quotedRange.end);
        if (!classValue.trim()) continue;

        addSelection(quotedRange.start, quotedRange.end);
      }
    }
  }

  selections.sort((a, b) => a.start.compareTo(b.start));
  return selections;
}