const vscode = require('vscode');

function initializeXPTracker(context, onBugFixed) {
    let previousErrorCount = 0;

    const diagnosticListener = vscode.languages.onDidChangeDiagnostics((event) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        // Count current errors in the active file
        const uri = editor.document.uri;
        const diagnostics = vscode.languages.getDiagnostics(uri);
        const currentErrorCount = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;

        // If errors decreased, a bug was fixed!
        if (currentErrorCount < previousErrorCount) {
            onBugFixed();
        }

        previousErrorCount = currentErrorCount;
    });

    context.subscriptions.push(diagnosticListener);
}

module.exports = { initializeXPTracker };