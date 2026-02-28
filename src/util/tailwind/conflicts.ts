const CONFLICT_GROUP_PATTERNS: Array<[RegExp, string]> = [
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

function getSpacingConflictGroup(utilityToken: string): string | null {
  const spacingMatch = utilityToken.match(/^(p|m)(x|y|t|r|b|l)?-/);
  if (spacingMatch) {
    const utilityPrefix = spacingMatch[1];
    const axis = spacingMatch[2] ?? "all";
    return `${utilityPrefix}-${axis}`;
  }

  const spaceAxisMatch = utilityToken.match(/^(space-[xy])-/);
  if (spaceAxisMatch) {
    return spaceAxisMatch[1];
  }

  return null;
}

export function getClassConflictKey(token: string): string | null {
  const trimmedToken = token.trim();
  if (!trimmedToken) return null;

  let lastVariantSeparatorIndex = -1;
  let squareBracketDepth = 0;
  let parenthesisDepth = 0;

  for (let i = 0; i < trimmedToken.length; i += 1) {
    const char = trimmedToken[i];
    if (char === "[") squareBracketDepth += 1;
    else if (char === "]") squareBracketDepth = Math.max(squareBracketDepth - 1, 0);
    else if (char === "(") parenthesisDepth += 1;
    else if (char === ")") parenthesisDepth = Math.max(parenthesisDepth - 1, 0);
    else if (char === ":" && squareBracketDepth === 0 && parenthesisDepth === 0) {
      lastVariantSeparatorIndex = i;
    }
  }

  const variantPrefix =
    lastVariantSeparatorIndex >= 0
      ? trimmedToken.slice(0, lastVariantSeparatorIndex)
      : "";
  let utilityToken =
    lastVariantSeparatorIndex >= 0
      ? trimmedToken.slice(lastVariantSeparatorIndex + 1)
      : trimmedToken;

  if (utilityToken.startsWith("!")) utilityToken = utilityToken.slice(1);
  if (utilityToken.startsWith("-")) utilityToken = utilityToken.slice(1);
  if (!utilityToken) return null;

  const spacingConflictGroup = getSpacingConflictGroup(utilityToken);
  if (spacingConflictGroup) {
    return `${variantPrefix}|${spacingConflictGroup}`;
  }

  for (const [conflictRegex, conflictGroup] of CONFLICT_GROUP_PATTERNS) {
    if (conflictRegex.test(utilityToken)) {
      return `${variantPrefix}|${conflictGroup}`;
    }
  }

  return null;
}