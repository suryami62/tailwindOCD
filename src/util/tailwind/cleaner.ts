import { getClassConflictKey } from "./conflicts";

export function cleanClassList(
  classList: string,
  cleanDuplicates: boolean,
  cleanConflicts: boolean,
): string {
  const classTokens = classList.split(/\s+/).filter(Boolean);
  if (classTokens.length <= 1) return classList.trim();

  const keptTokens: string[] = [];
  const seenClassTokens = new Set<string>();
  const seenConflictKeys = new Set<string>();

  for (let i = classTokens.length - 1; i >= 0; i -= 1) {
    const classToken = classTokens[i];

    if (cleanDuplicates && seenClassTokens.has(classToken)) {
      continue;
    }

    const conflictKey = cleanConflicts ? getClassConflictKey(classToken) : null;
    if (cleanConflicts && conflictKey && seenConflictKeys.has(conflictKey)) {
      continue;
    }

    if (cleanDuplicates) {
      seenClassTokens.add(classToken);
    }
    if (cleanConflicts && conflictKey) {
      seenConflictKeys.add(conflictKey);
    }

    keptTokens.push(classToken);
  }

  return keptTokens.reverse().join(" ");
}