import * as vscode from 'vscode';
import { subscribeToDocumentChange } from './diagnostics';
import { readContent, selectionHasCheckboxes, readSelectedTasks, replaceAll } from './content';
import { XitFoldingRangeProvider } from './folding';
import { XitDocumentSymbolProvider } from './symbol';
import { TAG_START, XitCompletionItemProvider } from './completion';
import { registerSemanticProvider } from './semantic'
import { join, dirname } from 'path';
import { getCurrentPeriod, syncWriteFile, Period, getSettings } from './utils';
import { XitCodeLensProvider } from './codelens';

let disposables: vscode.Disposable[] = [];

function clearItems(editor: vscode.TextEditor) {
	let groups = readContent(editor.document);
	const config = getSettings();
	let filename = "";

	if (config.to_be_saved) {
		const current_filename = editor.document.fileName;
		const current_path = dirname(current_filename);
		filename = join(current_path, config.filename);
	}

	editor.edit(builder => {
		const all_deleted = groups.flatMap((group) => group.delete_tasks());
		replaceAll(editor.document, builder, groups);

		if (config.to_be_saved) {
			try {
				let output = all_deleted.flatMap(task => task.lines).join("\n");
				syncWriteFile(filename, output + "\n");
			}
			catch {
				vscode.window.showErrorMessage("There is an issue with saving the deleted items to '" + filename + "' file.");
			}
		}
	});
}

function sortTasks(editor: vscode.TextEditor) {
	let groups = readContent(editor.document);

	editor.edit(builder => {
		groups.forEach((group) => group.sort_tasks());
		replaceAll(editor.document, builder, groups);
	});
}

function shiftSelectedCheckboxes(editor: vscode.TextEditor) {
	let selected_tasks = readSelectedTasks(editor);

	editor.edit(builder => {
		selected_tasks.forEach((task) => {
			task.shift_status();
			task.update_task(editor.document, builder);
		});
	})
}

function toggleSelectedCheckboxes(editor: vscode.TextEditor) {
	let selected_tasks = readSelectedTasks(editor);

	editor.edit(builder => {
		selected_tasks.forEach((task) => {
			task.toggle_status();
			task.update_task(editor.document, builder);
		});
	})
}

function increasePriorityOfSelected(editor: vscode.TextEditor) {
	let selected_tasks = readSelectedTasks(editor);

	editor.edit(builder => {
		selected_tasks.forEach((task) => {
			task.increase_priority();
			task.update_task(editor.document, builder);
		});
	})
}

function decreasePriorityOfSelected(editor: vscode.TextEditor) {
	let selected_tasks = readSelectedTasks(editor);

	editor.edit(builder => {
		selected_tasks.forEach((task) => {
			task.decrease_priority();
			task.update_task(editor.document, builder);
		});
	})
}

function increaseDateOfSelected(editor: vscode.TextEditor) {
	let selected_tasks = readSelectedTasks(editor);

	editor.edit(builder => {
		selected_tasks.forEach((task) => {
			task.increase_date();
			task.update_task(editor.document, builder);
		});
	})
}

function decreaseDateOfSelected(editor: vscode.TextEditor) {
	let selected_tasks = readSelectedTasks(editor);

	editor.edit(builder => {
		selected_tasks.forEach((task) => {
			task.decrease_date();
			task.update_task(editor.document, builder);
		});
	})
}

function insertCurrentPeriod(editor: vscode.TextEditor, edit: vscode.TextEditorEdit, period: Period) {
	editor.selections.forEach((selection, i) => {
		edit.insert(selection.active, getCurrentPeriod(period));
	})
}

export function activate(context: vscode.ExtensionContext) {
	const xitDiagnostics = vscode.languages.createDiagnosticCollection("xit");
	context.subscriptions.push(xitDiagnostics);

	subscribeToDocumentChange(context, xitDiagnostics);

	vscode.languages.registerFoldingRangeProvider({ scheme: 'file', language: 'xit' }, new XitFoldingRangeProvider());

	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider({ language: "xit" }, new XitDocumentSymbolProvider()));

	const completionDisposable = vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'xit' }, new XitCompletionItemProvider(), TAG_START);
	disposables.push(completionDisposable);

    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ scheme: 'file', language: 'xit' }, new XitCodeLensProvider()));

	context.subscriptions.push(
		vscode.commands.registerCommand('xit.toggle', () => {
			const editor = vscode.window.activeTextEditor!;
			toggleSelectedCheckboxes(editor);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('xit.shuffle', () => {
			const editor = vscode.window.activeTextEditor!;
			shiftSelectedCheckboxes(editor);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('xit.increasePriority', () => {
			const editor = vscode.window.activeTextEditor!;
			increasePriorityOfSelected(editor);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('xit.decreasePriority', () => {
			const editor = vscode.window.activeTextEditor!;
			decreasePriorityOfSelected(editor);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('xit.increaseDate', () => {
			const editor = vscode.window.activeTextEditor!;
			increaseDateOfSelected(editor);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('xit.decreaseDate', () => {
			const editor = vscode.window.activeTextEditor!;
			decreaseDateOfSelected(editor);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('xit.suggest', () => {
			const editor = vscode.window.activeTextEditor!;

			if (selectionHasCheckboxes(editor))
				vscode.commands.executeCommand('xit.toggle');
			else
				vscode.commands.executeCommand('editor.action.triggerSuggest');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('xit.clearItems', () => {
			const editor = vscode.window.activeTextEditor!;
			clearItems(editor);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('xit.sortItems', () => {
			const editor = vscode.window.activeTextEditor!;
			sortTasks(editor);
		})
	);

	context.subscriptions.push(vscode.commands.registerTextEditorCommand('xit.currentDay', (editor, edit) => insertCurrentPeriod(editor, edit, Period.Day)));
	context.subscriptions.push(vscode.commands.registerTextEditorCommand('xit.currentWeek', (editor, edit) => insertCurrentPeriod(editor, edit, Period.Week)));
	context.subscriptions.push(vscode.commands.registerTextEditorCommand('xit.currentMonth', (editor, edit) => insertCurrentPeriod(editor, edit, Period.Month)));
	context.subscriptions.push(vscode.commands.registerTextEditorCommand('xit.currentQuarter', (editor, edit) => insertCurrentPeriod(editor, edit, Period.Quarter)));
	context.subscriptions.push(vscode.commands.registerTextEditorCommand('xit.currentYear', (editor, edit) => insertCurrentPeriod(editor, edit, Period.Year)));

	registerSemanticProvider();
}

export function deactivate() {
	disposables.forEach(disposable => disposable.dispose());
}
