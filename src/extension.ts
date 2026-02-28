import * as vscode from "vscode";

const CLASS_ATTRIBUTE_PATTERN =
  /\b(?:class|className|ngClass|class:list)\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;

const DEFAULT_DYNAMIC_CLASS_FUNCTIONS = ["clsx", "cn", "classnames"];
const DEFAULT_IGNORE_COMMENT = "tailwindocd-ignore";

type ClassSelectionOptions = {
  dynamicClassFunctions: string[];
  ignoreCommentMarker: string;
};

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shouldIgnoreLine(
  document: vscode.TextDocument,
  lineNumber: number,
  ignoreCommentMarker: string,
): boolean {
  if (!ignoreCommentMarker.trim()) return false;
  const lineText = document.lineAt(lineNumber).text;
  return lineText.includes(ignoreCommentMarker);
}

function getClassConflictKey(token: string): string | null {
  let current = token.trim();
  if (!current) return null;

  let lastTopLevelColon = -1;
  let squareDepth = 0;
  let roundDepth = 0;

  for (let i = 0; i < current.length; i += 1) {
    const char = current[i];
    if (char === "[") squareDepth += 1;
    else if (char === "]") squareDepth = Math.max(squareDepth - 1, 0);
    else if (char === "(") roundDepth += 1;
    else if (char === ")") roundDepth = Math.max(roundDepth - 1, 0);
    else if (char === ":" && squareDepth === 0 && roundDepth === 0) {
      lastTopLevelColon = i;
    }
  }

  const variants =
    lastTopLevelColon >= 0 ? current.slice(0, lastTopLevelColon) : "";
  let utility =
    lastTopLevelColon >= 0 ? current.slice(lastTopLevelColon + 1) : current;

  if (utility.startsWith("!")) utility = utility.slice(1);
  if (utility.startsWith("-")) utility = utility.slice(1);
  if (!utility) return null;

  const conflictPatterns: Array<[RegExp, string]> = [
    [/^p(?:x|y|t|r|b|l)?-/, "padding"],
    [/^m(?:x|y|t|r|b|l)?-/, "margin"],
    [/^space-[xy]-/, "space"],
    [/^w-/, "width"],
    [/^min-w-/, "min-width"],
    [/^max-w-/, "max-width"],
    [/^h-/, "height"],
    [/^min-h-/, "min-height"],
    [/^max-h-/, "max-height"],
    [/^text-(?:left|center|right|justify|start|end)$/, "text-align"],
    [
      /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
      "font-weight",
    ],
    [
      /^(?:block|inline-block|inline|flex|inline-flex|grid|inline-grid|table|inline-table|contents|list-item|hidden)$/,
      "display",
    ],
  ];

  for (const [pattern, group] of conflictPatterns) {
    if (pattern.test(utility)) {
      return `${variants}|${group}`;
    }
  }

  return null;
}

function cleanClassList(
  classList: string,
  cleanDuplicates: boolean,
  cleanConflicts: boolean,
): string {
  const tokens = classList.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return classList.trim();

  const kept: string[] = [];
  const seenTokens = new Set<string>();
  const seenConflicts = new Set<string>();

  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const token = tokens[i];

    if (cleanDuplicates && seenTokens.has(token)) {
      continue;
    }

    const conflictKey = cleanConflicts ? getClassConflictKey(token) : null;
    if (cleanConflicts && conflictKey && seenConflicts.has(conflictKey)) {
      continue;
    }

    if (cleanDuplicates) {
      seenTokens.add(token);
    }
    if (cleanConflicts && conflictKey) {
      seenConflicts.add(conflictKey);
    }

    kept.push(token);
  }

  return kept.reverse().join(" ");
}

function findClosingParen(text: string, openParenIndex: number): number {
  let depth = 0;
  let stringQuote: '"' | "'" | "`" | null = null;
  let isEscaped = false;

  for (let i = openParenIndex; i < text.length; i += 1) {
    const char = text[i];

    if (stringQuote) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (char === "\\") {
        isEscaped = true;
        continue;
      }
      if (char === stringQuote) {
        stringQuote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      stringQuote = char;
      continue;
    }

    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function getQuotedStringRanges(
  text: string,
  absoluteOffset: number,
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];

  let i = 0;
  while (i < text.length) {
    const quote = text[i];
    if (quote !== '"' && quote !== "'" && quote !== "`") {
      i += 1;
      continue;
    }

    const contentStart = i + 1;
    let hasInterpolation = false;
    let escaped = false;
    i += 1;

    while (i < text.length) {
      const char = text[i];
      if (escaped) {
        escaped = false;
        i += 1;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        i += 1;
        continue;
      }
      if (quote === "`" && char === "$" && text[i + 1] === "{") {
        hasInterpolation = true;
      }
      if (char === quote) {
        if (!(quote === "`" && hasInterpolation)) {
          ranges.push({
            start: absoluteOffset + contentStart,
            end: absoluteOffset + i,
          });
        }
        i += 1;
        break;
      }
      i += 1;
    }
  }

  return ranges;
}

function getClassSelections(
  document: vscode.TextDocument,
  options: ClassSelectionOptions,
): vscode.Selection[] {
  const text = document.getText();
  const selections: vscode.Selection[] = [];
  const seen = new Set<string>();

  function pushSelection(startOffset: number, endOffset: number): void {
    if (endOffset <= startOffset) return;

    const start = document.positionAt(startOffset);
    if (shouldIgnoreLine(document, start.line, options.ignoreCommentMarker)) {
      return;
    }

    const end = document.positionAt(endOffset);
    const key = `${start.line}:${start.character}-${end.line}:${end.character}`;
    if (seen.has(key)) return;
    seen.add(key);
    selections.push(new vscode.Selection(start, end));
  }

  let match: RegExpExecArray | null;

  while ((match = CLASS_ATTRIBUTE_PATTERN.exec(text)) !== null) {
    const classList = match[1] ?? match[2] ?? match[3];
    if (!classList || !classList.trim()) continue;

    const classListOffset = match.index + match[0].indexOf(classList);
    pushSelection(classListOffset, classListOffset + classList.length);
  }

  const dynamicFunctions = options.dynamicClassFunctions
    .map((name) => name.trim())
    .filter(Boolean)
    .map(escapeForRegex);

  if (dynamicFunctions.length > 0) {
    const dynamicCallPattern = new RegExp(
      `\\b(?:${dynamicFunctions.join("|")})\\s*\\(`,
      "g",
    );

    while ((match = dynamicCallPattern.exec(text)) !== null) {
      const openParenIndex = match.index + match[0].lastIndexOf("(");
      const closeParenIndex = findClosingParen(text, openParenIndex);
      if (closeParenIndex < 0) continue;

      const argsStart = openParenIndex + 1;
      const argsText = text.slice(argsStart, closeParenIndex);
      const ranges = getQuotedStringRanges(argsText, argsStart);

      for (const range of ranges) {
        const classList = text.slice(range.start, range.end);
        if (!classList.trim()) continue;
        pushSelection(range.start, range.end);
      }
    }
  }

  selections.sort((a, b) => a.start.compareTo(b.start));
  return selections;
}

export const __test__ = {
  escapeForRegex,
  getClassConflictKey,
  cleanClassList,
  findClosingParen,
  getQuotedStringRanges,
};

async function cleanSelectionsInEditor(
  editor: vscode.TextEditor,
  selections: vscode.Selection[],
  cleanDuplicates: boolean,
  cleanConflicts: boolean,
): Promise<void> {
  const replacements: Array<{ range: vscode.Range; value: string }> = [];

  for (const selection of selections) {
    const original = editor.document.getText(selection);
    const cleaned = cleanClassList(original, cleanDuplicates, cleanConflicts);
    if (cleaned !== original) {
      replacements.push({ range: selection, value: cleaned });
    }
  }

  if (replacements.length === 0) return;

  await editor.edit((editBuilder) => {
    for (const replacement of replacements) {
      editBuilder.replace(replacement.range, replacement.value);
    }
  });
}

async function sortActiveEditorClasses(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const config = vscode.workspace.getConfiguration(
    "tailwindOCD",
    editor.document.uri,
  );
  const options: ClassSelectionOptions = {
    dynamicClassFunctions:
      config.get<string[]>(
        "dynamicClassFunctions",
        DEFAULT_DYNAMIC_CLASS_FUNCTIONS,
      ) ?? DEFAULT_DYNAMIC_CLASS_FUNCTIONS,
    ignoreCommentMarker:
      config.get<string>("ignoreCommentMarker", DEFAULT_IGNORE_COMMENT) ??
      DEFAULT_IGNORE_COMMENT,
  };
  const cleanDuplicates = config.get<boolean>("cleanDuplicates", true);
  const cleanConflicts = config.get<boolean>("cleanConflicts", true);

  const newSelections = getClassSelections(editor.document, options);
  if (newSelections.length === 0) return;

  const previousSelections = editor.selections;

  try {
    editor.selections = newSelections;
    await vscode.commands.executeCommand("tailwindCSS.sortSelection");

    if (cleanDuplicates || cleanConflicts) {
      const refreshedSelections = getClassSelections(editor.document, options);
      await cleanSelectionsInEditor(
        editor,
        refreshedSelections,
        cleanDuplicates,
        cleanConflicts,
      );
    }
  } finally {
    editor.selections = previousSelections;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "tailwindOCD.sortTailwindClasses",
      sortActiveEditorClasses,
    ),
  );

  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument((event) => {
      const config = vscode.workspace.getConfiguration(
        "tailwindOCD",
        event.document.uri,
      );
      if (!config.get<boolean>("sortOnSave")) return;
      if (event.document.uri.scheme !== "file") return;

      if (
        !vscode.window.activeTextEditor ||
        vscode.window.activeTextEditor.document !== event.document
      ) {
        return;
      }

      event.waitUntil(sortActiveEditorClasses());
    }),
  );
}

export function deactivate(): void {}
