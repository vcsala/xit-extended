import * as vscode from 'vscode';
import { subscribeToDocumentChange } from './diagnostics';
import { readContent, selectionHasCheckboxes, readSelectedTasks, replaceAll } from './content';
import { XitFoldingRangeProvider } from './folding';
import { XitDocumentSymbolProvider } from './symbol';
import { TAG_START, XitCompletionItemProvider } from './completion';
import { registerSemanticProvider } from './semantic'
import { join, dirname } from 'path';
import { syncWriteFile } from './utils';

let disposables: vscode.Disposable[] = [];

function getSettings(): {to_be_saved: boolean, filename: string} {
	const config = vscode.workspace.getConfiguration('xit-extended');

	return {to_be_saved: config.saveDeleted, filename: config.saveFilename};
}

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
		const all_deleted = groups.map((group) => group.delete_tasks()).flat();
		replaceAll(editor.document, builder, groups);

		if (config.to_be_saved) {
			try {
				let output = "";
				for (const task of all_deleted) {
					for (const line of task.lines) {
						output += line + "\n";
					}
				}
	
				syncWriteFile(filename, output);
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

function increasePriorityOfSekected(editor: vscode.TextEditor) {
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

export function activate(context: vscode.ExtensionContext) {
	const xitDiagnostics = vscode.languages.createDiagnosticCollection("xit");
	context.subscriptions.push(xitDiagnostics);

	subscribeToDocumentChange(context, xitDiagnostics);

	vscode.languages.registerFoldingRangeProvider({ scheme: 'file', language: 'xit' }, new XitFoldingRangeProvider());

	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider({ language: "xit" }, new XitDocumentSymbolProvider()));

	const completionDisposable = vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'xit' }, new XitCompletionItemProvider(), TAG_START);
	disposables.push(completionDisposable);

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
			increasePriorityOfSekected(editor);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('xit.decreasePriority', () => {
			const editor = vscode.window.activeTextEditor!;
			decreasePriorityOfSelected(editor);
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

	registerSemanticProvider();
}

export function deactivate() {
	disposables.forEach(disposable => disposable.dispose());
}
