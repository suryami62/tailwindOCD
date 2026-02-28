const vscode = require('vscode')

const CLASS_ATTRIBUTE_PATTERN =
  '\\b(?:class|className|ngClass|class:list)\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|`([^`]*)`)'

function getClassSelections(document) {
  let text = document.getText()
  let selections = []
  let classAttributePattern = new RegExp(CLASS_ATTRIBUTE_PATTERN, 'g')
  let match

  while ((match = classAttributePattern.exec(text)) !== null) {
    let classList = match[1] ?? match[2] ?? match[3]
    if (!classList || !classList.trim()) continue

    let classListOffset = match.index + match[0].indexOf(classList)
    let start = document.positionAt(classListOffset)
    let end = document.positionAt(classListOffset + classList.length)
    selections.push(new vscode.Selection(start, end))
  }

  return selections
}

async function sortActiveEditorClasses() {
  let editor = vscode.window.activeTextEditor
  if (!editor) return

  let newSelections = getClassSelections(editor.document)
  if (newSelections.length === 0) return

  let previousSelections = editor.selections

  try {
    editor.selections = newSelections
    await vscode.commands.executeCommand('tailwindCSS.sortSelection')
  } finally {
    editor.selections = previousSelections
  }
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('tailwindOCD.sortTailwindClasses', sortActiveEditorClasses),
  )

  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument((event) => {
      let config = vscode.workspace.getConfiguration('tailwindOCD', event.document.uri)
      if (!config.get('sortOnSave')) return
      if (event.document.uri.scheme !== 'file') return

      if (
        !vscode.window.activeTextEditor ||
        vscode.window.activeTextEditor.document !== event.document
      ) {
        return
      }

      event.waitUntil(sortActiveEditorClasses())
    }),
  )
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
}
