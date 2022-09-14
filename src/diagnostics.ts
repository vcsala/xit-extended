import * as vscode from 'vscode';

function checkContent(document: vscode.TextDocument): vscode.Diagnostic[] {
	let diagnostics: vscode.Diagnostic[] = [];
	let in_todo = false;
	let have_title = false;

	for (let i = 0; i < document.lineCount; i++) {
		let line = document.lineAt(i);
		if (line.text.startsWith("\[")) {
			// TODO: check items
			in_todo = true;
			have_title = false;
		} else if (line.text.startsWith("    ") && line.text.trim() != "") {
			if (!in_todo) {
				const range = new vscode.Range(i, 0, i, line.text.length);
				const diagnostic = new vscode.Diagnostic(range, "Only multiline tasks should be indented", vscode.DiagnosticSeverity.Warning);
				diagnostics.push(diagnostic);
			} else {
				const match = /^ {4}\S/.exec(line.text);

				if (!match) {
					const range = new vscode.Range(i, 0, i, line.text.length);
					const diagnostic = new vscode.Diagnostic(range, "Wrong indentation", vscode.DiagnosticSeverity.Warning);
					diagnostics.push(diagnostic);
				}	
			}
		} else if (line.text.trim() == "") {
			in_todo = false;

			if (have_title) {
				const range = new vscode.Range(i, 0, i, line.text.length);
				const diagnostic = new vscode.Diagnostic(range, "No blank lines are supposed to be between title and the respective tasks", 
					vscode.DiagnosticSeverity.Warning);
				diagnostics.push(diagnostic);
			}
		} else {
			if (have_title) {
				const range = new vscode.Range(i, 0, i, line.text.length);
				const diagnostic = new vscode.Diagnostic(range, "A task group can have only one title", 
					vscode.DiagnosticSeverity.Warning);
				diagnostics.push(diagnostic);
			}

			const match = /^\s+|^\[/.exec(line.text);

			if (match) {
				const range = new vscode.Range(i, 0, i, line.text.length);
				const diagnostic = new vscode.Diagnostic(range, "Title must not start with blank character or opening bracket character ([]", 
					vscode.DiagnosticSeverity.Warning);
				diagnostics.push(diagnostic);
			}

			have_title = true;
		}
	}

	return diagnostics;
}

function refreshDiagnostics(document: vscode.TextDocument, xitDiagnostics: vscode.DiagnosticCollection): void {
	const diagnostics: vscode.Diagnostic[] = checkContent(document);
	xitDiagnostics.set(document.uri, diagnostics);
}

export function subscribeToDocumentChange(context: vscode.ExtensionContext, xitDiagnostics: vscode.DiagnosticCollection): void {
	if (vscode.window.activeTextEditor?.document.languageId == "xit") {
		refreshDiagnostics(vscode.window.activeTextEditor.document, xitDiagnostics);
	}

	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor?.document.languageId == "xit") {
				refreshDiagnostics(editor.document, xitDiagnostics);
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(editor => {
			if (editor?.document.languageId == "xit") {
				refreshDiagnostics(editor.document, xitDiagnostics);
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument(document => {
			if (document.languageId == "xit") {
				refreshDiagnostics(document, xitDiagnostics);
			}
		})
	);
}
