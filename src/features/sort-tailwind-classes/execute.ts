import * as vscode from "vscode";
import { getClassSelections, type ClassSelectionOptions } from "../../core/document";
import { cleanClassList } from "../../core/tailwind";

async function cleanSelectionsInEditor(
  editor: vscode.TextEditor,
  selections: vscode.Selection[],
  cleanDuplicates: boolean,
  cleanConflicts: boolean,
): Promise<void> {
  const replacements: Array<{ range: vscode.Range; value: string }> = [];

  for (const selection of selections) {
    const originalClassList = editor.document.getText(selection);
    const cleanedClassList = cleanClassList(
      originalClassList,
      cleanDuplicates,
      cleanConflicts,
    );

    if (cleanedClassList !== originalClassList) {
      replacements.push({ range: selection, value: cleanedClassList });
    }
  }

  if (replacements.length === 0) return;

  await editor.edit((editBuilder) => {
    for (const replacement of replacements) {
      editBuilder.replace(replacement.range, replacement.value);
    }
  });
}

export async function sortEditorClasses(
  editor: vscode.TextEditor,
  selectionOptions: ClassSelectionOptions,
  cleanDuplicates: boolean,
  cleanConflicts: boolean,
): Promise<void> {
  const selections = getClassSelections(editor.document, selectionOptions);
  if (selections.length === 0) return;

  const previousSelections = editor.selections;

  try {
    editor.selections = selections;
    await vscode.commands.executeCommand("tailwindCSS.sortSelection");

    if (cleanDuplicates || cleanConflicts) {
      const refreshedSelections = getClassSelections(
        editor.document,
        selectionOptions,
      );
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