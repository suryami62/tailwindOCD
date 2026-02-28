import * as vscode from "vscode";

const CLASS_ATTRIBUTE_PATTERN =
  /\b(?:class|className|ngClass|class:list)\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;

function getClassSelections(document: vscode.TextDocument): vscode.Selection[] {
  const text = document.getText();
  const selections: vscode.Selection[] = [];
  let match: RegExpExecArray | null;

  while ((match = CLASS_ATTRIBUTE_PATTERN.exec(text)) !== null) {
    const classList = match[1] ?? match[2] ?? match[3];
    if (!classList || !classList.trim()) continue;

    const classListOffset = match.index + match[0].indexOf(classList);
    const start = document.positionAt(classListOffset);
    const end = document.positionAt(classListOffset + classList.length);
    selections.push(new vscode.Selection(start, end));
  }

  return selections;
}

async function sortActiveEditorClasses(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const newSelections = getClassSelections(editor.document);
  if (newSelections.length === 0) return;

  const previousSelections = editor.selections;

  try {
    editor.selections = newSelections;
    await vscode.commands.executeCommand("tailwindCSS.sortSelection");
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
