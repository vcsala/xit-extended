import * as vscode from 'vscode';
import { readContent } from './content';

export class XitDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
	public provideDocumentSymbols(document: vscode.TextDocument,
		token: vscode.CancellationToken): Thenable<vscode.SymbolInformation[]> {
		return new Promise((resolve, reject) => {
			const groups = readContent(document);
			let symbols: vscode.SymbolInformation[] = [];

			for (const group of groups) {
				if (group.is_task_group()) {
					symbols.push(group.get_symbol(document));
				}
			}
	
			resolve(symbols);
		});
	}
}