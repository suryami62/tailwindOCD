import * as vscode from "vscode";
import { sortActiveEditorClasses } from "./commands/sortTailwindClasses";
import { registerSortOnSave } from "./listeners/sortOnSave";

export function activate(context: vscode.ExtensionContext): void {
  const sortCommand = vscode.commands.registerCommand(
    "tailwindOCD.sortTailwindClasses",
    sortActiveEditorClasses,
  );
  const sortOnSaveListener = registerSortOnSave(sortActiveEditorClasses);

  context.subscriptions.push(sortCommand, sortOnSaveListener);
}

export function deactivate(): void { }
