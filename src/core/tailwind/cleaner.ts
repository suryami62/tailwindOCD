import { getClassConflictKey } from "./conflicts";

export function cleanClassList(
  classList: string,
  cleanDuplicates: boolean,
  cleanConflicts: boolean,
): string {
  const classTokens = classList.match(/\S+/g);
  if (!classTokens) return "";
  if (classTokens.length <= 1) return classTokens[0] ?? "";

  const keptTokens: string[] = [];
  const seenClassTokens = cleanDuplicates ? new Set<string>() : null;
  const seenConflictKeys = cleanConflicts ? new Set<string>() : null;

  for (let i = classTokens.length - 1; i >= 0; i -= 1) {
    const classToken = classTokens[i];

    if (seenClassTokens?.has(classToken)) {
      continue;
    }

    const conflictKey = cleanConflicts ? getClassConflictKey(classToken) : null;
    if (conflictKey && seenConflictKeys?.has(conflictKey)) {
      continue;
    }

    if (seenClassTokens) {
      seenClassTokens.add(classToken);
    }
    if (seenConflictKeys && conflictKey) {
      seenConflictKeys.add(conflictKey);
    }

    keptTokens.push(classToken);
  }

  if (!cleanDuplicates && !cleanConflicts) {
    return classTokens.join(" ");
  }

  return keptTokens.reverse().join(" ");
}