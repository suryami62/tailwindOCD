export function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findClosingParen(text: string, openParenIndex: number): number {
  let parenthesisDepth = 0;
  let activeQuote: '"' | "'" | "`" | null = null;
  let isEscaped = false;

  for (let index = openParenIndex; index < text.length; index += 1) {
    const char = text[index];

    if (activeQuote) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === "\\") {
        isEscaped = true;
        continue;
      }

      if (char === activeQuote) {
        activeQuote = null;
      }

      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      activeQuote = char;
      continue;
    }

    if (char === "(") parenthesisDepth += 1;
    if (char === ")") {
      parenthesisDepth -= 1;
      if (parenthesisDepth === 0) return index;
    }
  }

  return -1;
}

export function getQuotedStringRanges(
  text: string,
  absoluteOffset: number,
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];

  let index = 0;
  while (index < text.length) {
    const quoteChar = text[index];
    if (quoteChar !== '"' && quoteChar !== "'" && quoteChar !== "`") {
      index += 1;
      continue;
    }

    const contentStart = index + 1;
    let containsInterpolation = false;
    let isEscaped = false;
    index += 1;

    while (index < text.length) {
      const char = text[index];
      if (isEscaped) {
        isEscaped = false;
        index += 1;
        continue;
      }

      if (char === "\\") {
        isEscaped = true;
        index += 1;
        continue;
      }

      if (quoteChar === "`" && char === "$" && text[index + 1] === "{") {
        containsInterpolation = true;
      }

      if (char === quoteChar) {
        if (!(quoteChar === "`" && containsInterpolation)) {
          ranges.push({
            start: absoluteOffset + contentStart,
            end: absoluteOffset + index,
          });
        }

        index += 1;
        break;
      }

      index += 1;
    }
  }

  return ranges;
}