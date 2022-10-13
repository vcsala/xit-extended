import * as vscode from 'vscode';
import { getRawDate } from './content';
import * as globals from './globals'
import { ParsingState } from './globals'
import { checkDate, getSettings } from './utils';

function getPriority(line: string): string {
	const match = globals.ALT_PRIORITY_MASK.exec(line);

	if (match) {
		return match[1];
	}

	return "";
}

function checkPriority(priority: string): string {
	if (priority.startsWith(".") && priority.endsWith(".") && priority.indexOf("!") > -1) {
		return "The dots should appear either before or after the exclamation mark(s). (So they can neither appear in between nor on both sides.)";
	}

	const match = globals.WRONG_PRIORITY_MASK.exec(priority);

	if (match) {
		return "The dots should appear either before or after the exclamation mark(s). (So they can neither appear in between nor on both sides.)"
	}

	return "";
}

function checkContent(document: vscode.TextDocument): vscode.Diagnostic[] {
	let parsing_state: ParsingState = ParsingState.Start;
	let diagnostics: vscode.Diagnostic[] = [];
	let have_date = false;

	for (let i = 0; i < document.lineCount; i++) {
		let line = document.lineAt(i);
		if (line.text.startsWith("\[")) {
			const match = globals.CHECKBOX_MASK.exec(line.text);

			if (!match) {
				const closing_index = line.text.indexOf("]");

				if (closing_index < 0) {
					const range = new vscode.Range(i, 0, i, 0);
					const diagnostic = new vscode.Diagnostic(range, "Only tasks should start with opening bracket.",
						vscode.DiagnosticSeverity.Warning);
					diagnostics.push(diagnostic);
				} else {
					const range = new vscode.Range(i, 0, i, closing_index);
					const diagnostic = new vscode.Diagnostic(range, "Invalid checkbox.",
						vscode.DiagnosticSeverity.Warning);
					diagnostics.push(diagnostic);
				}

				parsing_state = ParsingState.Title;
			} else {
				const date_match = getRawDate(line.text);

				if (date_match.index > 0) {
					const date = date_match.text;
					const message = checkDate(date);

					if (message != "") {
						const range = new vscode.Range(i, date_match.index, i, date_match.index + date.length);
						const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
						diagnostics.push(diagnostic);
					}

					have_date = true;
				}

				const priority = getPriority(line.text);

				if (priority != "") {
					const message = checkPriority(priority);

					if (message != "") {
						const range = new vscode.Range(i, 4, i, priority.length + 4);
						const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
						diagnostics.push(diagnostic);
					}
				}

				parsing_state = ParsingState.TaskHead;
			}
		} else if (line.text.startsWith("    ") && line.text.trim() != "") {
			if (parsing_state != ParsingState.TaskHead && parsing_state != ParsingState.TaskBody) {
				const range = new vscode.Range(i, 0, i, line.text.length);
				const diagnostic = new vscode.Diagnostic(range, "Only multiline tasks should be indented", vscode.DiagnosticSeverity.Warning);
				diagnostics.push(diagnostic);

				if (parsing_state != ParsingState.Start && parsing_state != ParsingState.BlankLine) {
					const range = new vscode.Range(i, 0, i, line.text.length);
					const diagnostic = new vscode.Diagnostic(range, "Title should be separated by a blank line from a preceding item.", vscode.DiagnosticSeverity.Warning);
					diagnostics.push(diagnostic);
				}

				parsing_state = ParsingState.Title;
			} else {
				if (!have_date) {
					const date_match = getRawDate(line.text);

					if (date_match.index > 0) {
						const date = date_match.text;
						const message = checkDate(date);

						if (message != "") {
							const range = new vscode.Range(i, date_match.index, i, date_match.index + date.length);
							const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
							diagnostics.push(diagnostic);
						}

						have_date = true;
					}
				}

				parsing_state = ParsingState.TaskBody;
			}
		} else if (line.text.trim() == "") {
			parsing_state = ParsingState.BlankLine;
		} else {
			if (parsing_state != ParsingState.Start && parsing_state != ParsingState.BlankLine) {
				const range = new vscode.Range(i, 0, i, line.text.length);
				const diagnostic = new vscode.Diagnostic(range, "Title should be separated by a blank line from a preceding item.", vscode.DiagnosticSeverity.Warning);
				diagnostics.push(diagnostic);
			}

			const match = globals.WRONG_TITLE_MASK.exec(line.text);

			if (match) {
				const range = new vscode.Range(i, 0, i, line.text.length);
				const diagnostic = new vscode.Diagnostic(range, "Title must not start with blank character or opening bracket character ([)",
					vscode.DiagnosticSeverity.Warning);
				diagnostics.push(diagnostic);
			}

			parsing_state = ParsingState.Title;
		}
	}

	if (parsing_state != ParsingState.BlankLine) {
		const index = document.lineCount - 1
		const line = document.lineAt(index);

		const range = new vscode.Range(index, line.text.length, index, line.text.length);
		const diagnostic = new vscode.Diagnostic(range, "There should be a newline at the end of the file",
			vscode.DiagnosticSeverity.Warning);
		diagnostics.push(diagnostic);
	}

	return diagnostics;
}

function refreshDiagnostics(document: vscode.TextDocument, xitDiagnostics: vscode.DiagnosticCollection): void {
	let diagnostics: vscode.Diagnostic[] = [];
	const config = getSettings();

	if (config.enable_diagnostics) {
		diagnostics = checkContent(document);
	}

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
