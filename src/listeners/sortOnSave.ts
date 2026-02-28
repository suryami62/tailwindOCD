import * as vscode from "vscode";

export function registerSortOnSave(
  onSort: () => Promise<void>,
): vscode.Disposable {
  return vscode.workspace.onWillSaveTextDocument((event) => {
    const workspaceConfig = vscode.workspace.getConfiguration(
      "tailwindOCD",
      event.document.uri,
    );
    if (!workspaceConfig.get<boolean>("sortOnSave")) return;
    if (event.document.uri.scheme !== "file") return;

    if (
      !vscode.window.activeTextEditor ||
      vscode.window.activeTextEditor.document !== event.document
    ) {
      return;
    }

    event.waitUntil(
      onSort().catch((error) => {
        console.error("[tailwindOCD] sortOnSave failed", error);
      }),
    );
  });
}