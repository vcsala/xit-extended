import { measureMemory } from 'vm';
import * as vscode from 'vscode';

function daysInMonth(year: number, month: number): number { // month is 0 indexed: 0-11
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
	const re = /([^\w\s\/-]|[ ])-> ([0-9]{4}|[0-9]{4}-W?[0-9]{2}|[0-9]{4}-Q[0-9]|[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{4}\/W?[0-9]{2}|[0-9]{4}\/Q[0-9]|[0-9]{4}\/[0-9]{2}\/[0-9]{2})([ ]|$|[^\w\s?\/-])/;
	const match = re.exec(line);

	if (match) {
		return [match[2].trim().replace("/", "-"), match.index + 4] as const;
	}

	return ["", -1] as const;
}

function checkDate(date: string): string {
	const match_full = /[0-9]{4}-[0-9]{2}-[0-9]{2}/.exec(date);

	if (match_full) {
		const year: number = parseInt(date.substring(0, 4));
		const month: number = parseInt(date.substring(5, 7));
		const day: number = parseInt(date.substring(8));

		if (!isValid(year, month, day)) {
			return "Invalid month or day";
		}
	}

	const match_month = /[0-9]{4}-[0-9]{2}/.exec(date);

	if (match_month) {
		const year: number = parseInt(date.substring(0, 4));
		const month: number = parseInt(date.substring(5, 7));

		if (month < 1 || month > 12) {
			return "Invalid month";
		}
	}

	const match_quarter = /[0-9]{4}-Q[0-9]/.exec(date);

	if (match_quarter) {
		const year: number = parseInt(date.substring(0, 4));
		const quarter: number = parseInt(date.substring(6));

		if (quarter < 1 || quarter > 4) {
			return "Invalid quarter";
		}
	}

	const match_week = /[0-9]{4}-W[0-9]{2}/.exec(date);

	if (match_week) {
		const year: number = parseInt(date.substring(0, 4));
		const week: number = parseInt(date.substring(6));

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
	if (priority.startsWith(".") && priority.endsWith(".") && priority.indexOf("!") > -1) {
		return "The dots should appear either before or after the exclamation mark(s). (So they can neither appear in between nor on both sides.)";
	}

	const match = /\.*!+\.+!+\.*/.exec(priority);

	if (match) {
		return "The dots should appear either before or after the exclamation mark(s). (So they can neither appear in between nor on both sides.)"
	}

	return "";
}

enum ParsingState {
	Start,
	BlankLine,
	Title,
	TaskHead,
	TaskBody
}

function checkContent(document: vscode.TextDocument): vscode.Diagnostic[] {
	let parsing_state: ParsingState = ParsingState.Start;
	let diagnostics: vscode.Diagnostic[] = [];
	let in_todo = false;
	let have_title = false;
	let have_date = false;
	let is_blank = false;

	for (let i = 0; i < document.lineCount; i++) {
		let line = document.lineAt(i);
		if (line.text.startsWith("\[")) {
			const match = /^\[[ x@~]\]( |$)/.exec(line.text);

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

			const match = /^\s+|^\[/.exec(line.text);

			if (match) {
				const range = new vscode.Range(i, 0, i, line.text.length);
				const diagnostic = new vscode.Diagnostic(range, "Title must not start with blank character or opening bracket character ([)",
					vscode.DiagnosticSeverity.Warning);
				diagnostics.push(diagnostic);
			}

			have_title = true;

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
