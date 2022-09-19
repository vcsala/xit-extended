import { measureMemory } from 'vm';
import * as vscode from 'vscode';

function daysInMonth(year: number, month: number): number { // m is 0 indexed: 0-11
	switch (month) {
		case 2:
			return (year % 4 == 0 && year % 100) || year % 400 == 0 ? 29 : 28;
		case 9: case 4: case 6: case 11:
			return 30;
		default:
			return 31
	}
}

function isValid(year: number, month: number, day: number): boolean {
	return month >= 1 && month <= 12 && day > 0 && day <= daysInMonth(year, month);
}

function getDate(line: string): readonly [string, number] {
	const re = /-> [0-9]{4}-([QW]?[0-9]{2}|[0-9]{2}-[0-9]{2}) /;
	const match = re.exec(line);

	if (match) {
		return [match[0].substring(2).trim(), match.index + 3] as const;
	}

	return ["", -1] as const;
}

function checkDate(date: string): string {
	const match_full = /[0-9]{4}-[0-9]{2}-[0-9]{2}/.exec(date);

	if (match_full) {
		const year: number = parseInt(date.substr(0, 4));
		const month: number = parseInt(date.substr(5, 2));
		const day: number = parseInt(date.substr(8));

		if (!isValid(year, month, day)) {
			return "Invalid month or day";
		}
	}

	const match_month = /[0-9]{4}-[0-9]{2}/.exec(date);

	if (match_month) {
		const year: number = parseInt(date.substr(0, 4));
		const month: number = parseInt(date.substr(5));

		if (month < 1 || month > 12) {
			return "Invalid monht";
		}
	}

	const match_quarter = /[0-9]{4}-Q[0-9]{2}/.exec(date);

	if (match_quarter) {
		const year: number = parseInt(date.substr(0, 4));
		const quarter: number = parseInt(date.substr(6));

		if (quarter < 1 || quarter > 4) {
			return "Invalid quarter";
		}
	}

	const match_week = /[0-9]{4}-W[0-9]{2}/.exec(date);

	if (match_week) {
		const year: number = parseInt(date.substr(0, 4));
		const week: number = parseInt(date.substr(6));

		if (week < 1 || week > 52) {
			return "Invalid week number";
		}
	}

	return "";
}

function getPriority(line: string): string {
	const match = /^\[[ x@~]\] \s*([!\.]+)/.exec(line);

	if (match) {
		return match[1];
	}

	return "";
}

function checkPriority(priority: string): string {
	if (priority.startsWith(".") && priority.endsWith(".")) {
		return "The dots should appear either before or after the exclamation mark(s). (So they can neither appear in between nor on both sides.)";
	}

	const match = /\.*!+\.+!+\.*/.exec(priority);

	if (match) {
		return "The dots should appear either before or after the exclamation mark(s). (So they can neither appear in between nor on both sides.)"
	}

	return "";
}

function checkContent(document: vscode.TextDocument): vscode.Diagnostic[] {
	let diagnostics: vscode.Diagnostic[] = [];
	let in_todo = false;
	let have_title = false;
	let have_date = false;
	let is_blank = false;

	for (let i = 0; i < document.lineCount; i++) {
		let line = document.lineAt(i);
		if (line.text.startsWith("\[")) {
			const match = /^\[[ x@~]\] /.exec(line.text);

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
			} else {
				const match_first_char = /^\[[ x@~]\] \s/.exec(line.text);

				if (match_first_char) {
					const range = new vscode.Range(i, 4, i, 4);
					const diagnostic = new vscode.Diagnostic(range, "The checkbox and the description should be separated only with one space.",
						vscode.DiagnosticSeverity.Warning);
					diagnostics.push(diagnostic);
				}

				const date_match = getDate(line.text);

				if (date_match[1] > 0) {
					const date = date_match[0];
					const message = checkDate(date);

					if (message != "") {
						const range = new vscode.Range(i, date_match[1], i, date_match[1] + date_match[0].length);
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

				in_todo = true;
				have_title = false;
				is_blank = false;
			}
		} else if (line.text.startsWith("    ") && line.text.trim() != "") {
			is_blank = false;

			if (!in_todo) {
				const range = new vscode.Range(i, 0, i, line.text.length);
				const diagnostic = new vscode.Diagnostic(range, "Only multiline tasks should be indented", vscode.DiagnosticSeverity.Warning);
				diagnostics.push(diagnostic);
			} else {
				const match = /^ {4}\S/.exec(line.text);

				if (!match) {
					const range = new vscode.Range(i, 0, i, line.text.length);
					const diagnostic = new vscode.Diagnostic(range, "Wrong indentation (exactly 4 spaces are expected)", vscode.DiagnosticSeverity.Warning);
					diagnostics.push(diagnostic);
				}

				if (!have_date) {
					const date_match = getDate(line.text);

					if (date_match[1] > 0) {
						const date = date_match[0];
						const message = checkDate(date);

						if (message != "") {
							const range = new vscode.Range(i, date_match[1], i, date_match[1] + date_match[0].length);
							const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
							diagnostics.push(diagnostic);
						}

						have_date = true;
					}
				}
			}
		} else if (line.text.trim() == "") {
			is_blank = true;
			in_todo = false;
			have_date = false;

			if (have_title) {
				const range = new vscode.Range(i, 0, i, line.text.length);
				const diagnostic = new vscode.Diagnostic(range, "No blank lines are supposed to be between title and the respective tasks",
					vscode.DiagnosticSeverity.Warning);
				diagnostics.push(diagnostic);
			}
		} else {
			is_blank = false;
			
			if (have_title) {
				const range = new vscode.Range(i, 0, i, line.text.length);
				const diagnostic = new vscode.Diagnostic(range, "A task group can have only one title",
					vscode.DiagnosticSeverity.Warning);
				diagnostics.push(diagnostic);
			}

			const match = /^\s+|^\[/.exec(line.text);

			if (match) {
				const range = new vscode.Range(i, 0, i, line.text.length);
				const diagnostic = new vscode.Diagnostic(range, "Title must not start with blank character or opening bracket character ([)",
					vscode.DiagnosticSeverity.Warning);
				diagnostics.push(diagnostic);
			}

			have_title = true;
		}
	}

	if (!is_blank) {
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
