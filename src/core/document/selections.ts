import * as vscode from "vscode";
import { CLASS_ATTRIBUTE_REGEX } from "./patterns";
import {
  escapeForRegex,
  findClosingParen,
  getQuotedStringRanges,
} from "./parsing";
import {
  ClassSelectionOptions,
  CustomClassRegexSetting,
} from "./types";

type IndexedMatch = RegExpExecArray & {
  indices?: Array<[number, number] | undefined>;
};

type CompiledCustomRegexEntry = {
  outerRegex: RegExp;
  innerRegex: RegExp | null;
};

const NON_WHITESPACE_REGEX = /\S/;
const regexCache = new Map<string, RegExp | null>();
const dynamicCallRegexCache = new Map<string, RegExp>();
const compiledCustomRegexIdentityCache = new WeakMap<
  CustomClassRegexSetting[],
  CompiledCustomRegexEntry[]
>();
const dynamicCallRegexIdentityCache = new WeakMap<string[], RegExp | null>();
const EMPTY_CUSTOM_REGEX_ENTRIES: CompiledCustomRegexEntry[] = [];

function buildSelectionKey(startOffset: number, endOffset: number): string {
  return `${startOffset}:${endOffset}`;
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

function withRequiredFlags(flags: string, requiredFlags: string): string {
  let nextFlags = flags;

  for (const flag of requiredFlags) {
    if (!nextFlags.includes(flag)) {
      nextFlags += flag;
    }
  }

  return nextFlags;
}

function createRegex(patternSource: string, requiredFlags: string): RegExp | null {
  const trimmedPattern = patternSource.trim();
  if (!trimmedPattern) return null;

  try {
    if (trimmedPattern.startsWith("/")) {
      const lastSlashIndex = trimmedPattern.lastIndexOf("/");
      if (lastSlashIndex > 0) {
        const source = trimmedPattern.slice(1, lastSlashIndex);
        const flags = trimmedPattern.slice(lastSlashIndex + 1);
        return new RegExp(source, withRequiredFlags(flags, requiredFlags));
      }
    }

    return new RegExp(trimmedPattern, requiredFlags);
  } catch {
    return null;
  }
}

function getCachedRegex(patternSource: string, requiredFlags: string): RegExp | null {
  const cacheKey = `${requiredFlags}\u0000${patternSource}`;

  if (regexCache.has(cacheKey)) {
    return regexCache.get(cacheKey) ?? null;
  }

  const compiledRegex = createRegex(patternSource, requiredFlags);
  regexCache.set(cacheKey, compiledRegex);
  return compiledRegex;
}

function getFirstCaptureRange(match: IndexedMatch): [number, number] | null {
  const captureIndices = match.indices?.[1];
  if (!captureIndices) return null;

  const capturedValue = match[1];
  if (capturedValue === undefined) return null;

  return captureIndices;
}

function getCompiledCustomRegexEntries(
  customClassRegex: CustomClassRegexSetting[],
): CompiledCustomRegexEntry[] {
  const cachedEntries = compiledCustomRegexIdentityCache.get(customClassRegex);
  if (cachedEntries) return cachedEntries;

  const compiledEntries: CompiledCustomRegexEntry[] = [];

  for (const entry of customClassRegex) {
    const patterns = Array.isArray(entry) ? entry : [entry];
    const outerPattern = patterns[0];
    const innerPattern = patterns[1] ?? null;

    if (!outerPattern) continue;

    const outerRegex = getCachedRegex(outerPattern, "gd");
    if (!outerRegex) continue;

    if (!innerPattern) {
      compiledEntries.push({ outerRegex, innerRegex: null });
      continue;
    }

    const innerRegex = getCachedRegex(innerPattern, "gd");
    if (!innerRegex) continue;

    compiledEntries.push({ outerRegex, innerRegex });
  }

  compiledCustomRegexIdentityCache.set(customClassRegex, compiledEntries);
  return compiledEntries;
}

function getDynamicCallRegex(dynamicClassFunctions: string[]): RegExp | null {
  const cachedRegex = dynamicCallRegexIdentityCache.get(dynamicClassFunctions);
  if (cachedRegex !== undefined) {
    if (cachedRegex) {
      cachedRegex.lastIndex = 0;
    }
    return cachedRegex;
  }

  const escapedFunctionNames: string[] = [];

  for (const functionName of dynamicClassFunctions) {
    const trimmedFunctionName = functionName.trim();
    if (!trimmedFunctionName) continue;
    escapedFunctionNames.push(escapeForRegex(trimmedFunctionName));
  }

  if (escapedFunctionNames.length === 0) {
    dynamicCallRegexIdentityCache.set(dynamicClassFunctions, null);
    return null;
  }

  const cacheKey = escapedFunctionNames.join("\u0000");
  let dynamicCallRegex = dynamicCallRegexCache.get(cacheKey);

  if (!dynamicCallRegex) {
    dynamicCallRegex = new RegExp(
      `\\b(?:${escapedFunctionNames.join("|")})\\s*\\(`,
      "g",
    );
    dynamicCallRegexCache.set(cacheKey, dynamicCallRegex);
  }

  dynamicCallRegexIdentityCache.set(dynamicClassFunctions, dynamicCallRegex);
  dynamicCallRegex.lastIndex = 0;
  return dynamicCallRegex;
}

function addCustomRegexSelections(
  text: string,
  compiledCustomRegexEntries: CompiledCustomRegexEntry[],
  addSelection: (startOffset: number, endOffset: number) => void,
): void {
  for (const compiledEntry of compiledCustomRegexEntries) {
    compiledEntry.outerRegex.lastIndex = 0;

    let outerMatch: IndexedMatch | null;
    while ((outerMatch = compiledEntry.outerRegex.exec(text) as IndexedMatch | null) !== null) {
      if (!outerMatch[0]) {
        compiledEntry.outerRegex.lastIndex += 1;
        continue;
      }

      const containerRange = getFirstCaptureRange(outerMatch);
      if (!containerRange) continue;

      const [outerMatchStart, outerMatchEnd] = containerRange;
      const containerText = text.slice(outerMatchStart, outerMatchEnd);

      if (!compiledEntry.innerRegex) {
        addSelection(outerMatchStart, outerMatchEnd);
        continue;
      }

      compiledEntry.innerRegex.lastIndex = 0;

      let innerMatch: IndexedMatch | null;
      while (
        (innerMatch = compiledEntry.innerRegex.exec(containerText) as IndexedMatch | null) !== null
      ) {
        if (!innerMatch[0]) {
          compiledEntry.innerRegex.lastIndex += 1;
          continue;
        }

        const innerRange = getFirstCaptureRange(innerMatch);
        if (!innerRange) continue;

        const [innerMatchStart, innerMatchEnd] = innerRange;
        addSelection(
          outerMatchStart + innerMatchStart,
          outerMatchStart + innerMatchEnd,
        );
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
  const compiledCustomRegexEntries =
    options.customClassRegex.length > 0
      ? getCompiledCustomRegexEntries(options.customClassRegex)
      : EMPTY_CUSTOM_REGEX_ENTRIES;
  const dynamicCallRegex = getDynamicCallRegex(options.dynamicClassFunctions);
  const seenKeys = new Set<string>();

  CLASS_ATTRIBUTE_REGEX.lastIndex = 0;

  function addSelection(startOffset: number, endOffset: number): void {
    if (endOffset <= startOffset) return;

    const selectionKey = buildSelectionKey(startOffset, endOffset);
    if (seenKeys.has(selectionKey)) return;

    seenKeys.add(selectionKey);

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

    selections.push(new vscode.Selection(start, end));
  }

  let match: RegExpExecArray | null;

  while ((match = CLASS_ATTRIBUTE_REGEX.exec(text)) !== null) {
    const classValue = match[1] ?? match[2] ?? match[3];
    if (!classValue || !NON_WHITESPACE_REGEX.test(classValue)) continue;

    const classValueOffset = match.index + match[0].indexOf(classValue);
    addSelection(classValueOffset, classValueOffset + classValue.length);
  }

  if (dynamicCallRegex) {
    while ((match = dynamicCallRegex.exec(text)) !== null) {
      const openParenIndex = match.index + match[0].lastIndexOf("(");
      const closeParenIndex = findClosingParen(text, openParenIndex);
      if (closeParenIndex < 0) continue;

      const argsStart = openParenIndex + 1;
      const argsText = text.slice(argsStart, closeParenIndex);
      const quotedRanges = getQuotedStringRanges(argsText, argsStart);

      for (const quotedRange of quotedRanges) {
        const classValue = text.slice(quotedRange.start, quotedRange.end);
        if (!NON_WHITESPACE_REGEX.test(classValue)) continue;

        addSelection(quotedRange.start, quotedRange.end);
      }
    }
  }

  if (compiledCustomRegexEntries.length > 0) {
    addCustomRegexSelections(text, compiledCustomRegexEntries, addSelection);
  }

  selections.sort((a, b) => a.start.compareTo(b.start));
  return selections;
}