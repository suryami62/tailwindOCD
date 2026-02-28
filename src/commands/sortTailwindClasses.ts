import * as vscode from "vscode";
import {
  ClassSelectionOptions,
  DEFAULT_DYNAMIC_CLASS_FUNCTIONS,
  DEFAULT_IGNORE_COMMENT,
} from "../util/constants";
import { getClassSelections } from "../util/document";
import { cleanClassList } from "../util/tailwind";

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

export async function sortActiveEditorClasses(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const config = vscode.workspace.getConfiguration(
    "tailwindOCD",
    editor.document.uri,
  );
  const selectionOptions: ClassSelectionOptions = {
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