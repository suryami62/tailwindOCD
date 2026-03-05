import * as vscode from "vscode";
import {
  CLASS_ATTRIBUTE_REGEX,
  ClassSelectionOptions,
  CustomClassRegexSetting,
} from "../constants";
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

function ensureGlobalRegex(pattern: RegExp): RegExp {
  const flags = pattern.flags.includes("g")
    ? pattern.flags
    : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
}

function parseRegexPattern(patternSource: string): RegExp | null {
  const trimmedPattern = patternSource.trim();
  if (!trimmedPattern) return null;

  try {
    if (trimmedPattern.startsWith("/")) {
      const lastSlashIndex = trimmedPattern.lastIndexOf("/");
      if (lastSlashIndex > 0) {
        const source = trimmedPattern.slice(1, lastSlashIndex);
        const flags = trimmedPattern.slice(lastSlashIndex + 1);
        return ensureGlobalRegex(new RegExp(source, flags));
      }
    }

    return new RegExp(trimmedPattern, "g");
  } catch {
    return null;
  }
}

function addFirstCapturedGroupSelection(
  match: RegExpExecArray,
  matchStartOffset: number,
  addSelection: (startOffset: number, endOffset: number) => void,
): boolean {
  for (let groupIndex = 1; groupIndex < match.length; groupIndex += 1) {
    const capturedValue = match[groupIndex];
    if (!capturedValue || !capturedValue.trim()) continue;

    const relativeIndex = match[0].indexOf(capturedValue);
    if (relativeIndex < 0) continue;

    addSelection(
      matchStartOffset + relativeIndex,
      matchStartOffset + relativeIndex + capturedValue.length,
    );
    return true;
  }

  return false;
}

function addCustomRegexSelections(
  text: string,
  customClassRegex: CustomClassRegexSetting[],
  addSelection: (startOffset: number, endOffset: number) => void,
): void {
  for (const entry of customClassRegex) {
    const isPairEntry = Array.isArray(entry);
    const outerPattern = isPairEntry ? entry[0] : entry;
    const innerPattern = isPairEntry ? entry[1] : null;

    if (!outerPattern) continue;

    const outerRegex = parseRegexPattern(outerPattern);
    if (!outerRegex) continue;

    let outerMatch: RegExpExecArray | null;
    while ((outerMatch = outerRegex.exec(text)) !== null) {
      if (!outerMatch[0]) {
        outerRegex.lastIndex += 1;
        continue;
      }

      const outerMatchStart = outerMatch.index;
      const outerMatchEnd = outerMatchStart + outerMatch[0].length;

      if (innerPattern) {
        const innerRegex = parseRegexPattern(innerPattern);
        if (!innerRegex) continue;

        const searchSegments: Array<{ text: string; startOffset: number }> = [];

        if (outerMatch.length > 1) {
          let searchFromIndex = 0;
          for (let groupIndex = 1; groupIndex < outerMatch.length; groupIndex += 1) {
            const capturedValue = outerMatch[groupIndex];
            if (!capturedValue) continue;

            const relativeIndex = outerMatch[0].indexOf(capturedValue, searchFromIndex);
            if (relativeIndex < 0) continue;

            searchSegments.push({
              text: capturedValue,
              startOffset: outerMatchStart + relativeIndex,
            });
            searchFromIndex = relativeIndex + capturedValue.length;
          }
        }

        if (searchSegments.length === 0) {
          const outerText = text.slice(outerMatchStart, outerMatchEnd);
          const quotedRanges = getQuotedStringRanges(outerText, outerMatchStart);

          for (const quotedRange of quotedRanges) {
            searchSegments.push({
              text: text.slice(quotedRange.start, quotedRange.end),
              startOffset: quotedRange.start,
            });
          }

          if (searchSegments.length === 0) {
            searchSegments.push({
              text: outerText,
              startOffset: outerMatchStart,
            });
          }
        }

        let firstInnerStart = -1;
        let lastInnerEnd = -1;

        for (const segment of searchSegments) {
          innerRegex.lastIndex = 0;
          let innerMatch: RegExpExecArray | null;

          while ((innerMatch = innerRegex.exec(segment.text)) !== null) {
            if (!innerMatch[0]) {
              innerRegex.lastIndex += 1;
              continue;
            }

            const capturedValue = innerMatch[1] ?? innerMatch[0];
            if (!capturedValue.trim()) continue;

            const relativeIndex = innerMatch[0].indexOf(capturedValue);
            const tokenStart =
              segment.startOffset + innerMatch.index + Math.max(relativeIndex, 0);
            const tokenEnd = tokenStart + capturedValue.length;

            if (firstInnerStart < 0 || tokenStart < firstInnerStart) {
              firstInnerStart = tokenStart;
            }
            if (tokenEnd > lastInnerEnd) {
              lastInnerEnd = tokenEnd;
            }
          }
        }

        if (firstInnerStart >= 0 && lastInnerEnd > firstInnerStart) {
          addSelection(firstInnerStart, lastInnerEnd);
          continue;
        }
      }

      const hasCapturedGroup = addFirstCapturedGroupSelection(
        outerMatch,
        outerMatchStart,
        addSelection,
      );

      if (!hasCapturedGroup) {
        addSelection(outerMatchStart, outerMatchEnd);
      }
    }
  }
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

  if (options.customClassRegex.length > 0) {
    addCustomRegexSelections(text, options.customClassRegex, addSelection);
  }

  selections.sort((a, b) => a.start.compareTo(b.start));
  return selections;
}