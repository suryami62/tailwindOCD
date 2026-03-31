import * as vscode from "vscode";
import {
  DEFAULT_CUSTOM_CLASS_REGEX,
  DEFAULT_DYNAMIC_CLASS_FUNCTIONS,
  DEFAULT_IGNORE_COMMENT,
} from "../../config/defaults";
import { type ClassSelectionOptions } from "../../core/document";
import { sortEditorClasses } from "./execute";

function getSelectionOptions(
  config: vscode.WorkspaceConfiguration,
): ClassSelectionOptions {
  return {
    dynamicClassFunctions:
      config.get<string[]>(
        "dynamicClassFunctions",
        DEFAULT_DYNAMIC_CLASS_FUNCTIONS,
      ) ?? DEFAULT_DYNAMIC_CLASS_FUNCTIONS,
    ignoreCommentMarker:
      config.get<string>("ignoreCommentMarker", DEFAULT_IGNORE_COMMENT) ??
      DEFAULT_IGNORE_COMMENT,
    customClassRegex:
      config.get("customClassRegex", DEFAULT_CUSTOM_CLASS_REGEX) ??
      DEFAULT_CUSTOM_CLASS_REGEX,
  };
}

export async function sortActiveEditorClasses(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const config = vscode.workspace.getConfiguration(
    "tailwindOCD",
    editor.document.uri,
  );
  const cleanDuplicates = config.get<boolean>("cleanDuplicates", true);
  const cleanConflicts = config.get<boolean>("cleanConflicts", true);

  await sortEditorClasses(
    editor,
    getSelectionOptions(config),
    cleanDuplicates,
    cleanConflicts,
  );
}