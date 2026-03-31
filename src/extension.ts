import * as vscode from "vscode";
import {
  registerSortOnSave,
  sortActiveEditorClasses,
} from "./features/sort-tailwind-classes";

export function activate(context: vscode.ExtensionContext): void {
  const sortCommand = vscode.commands.registerCommand(
    "tailwindOCD.sortTailwindClasses",
    sortActiveEditorClasses,
  );
  const sortOnSaveListener = registerSortOnSave(sortActiveEditorClasses);

  context.subscriptions.push(sortCommand, sortOnSaveListener);
}

export function deactivate(): void { }
