import * as vscode from 'vscode';
import { readContent, getAllTags } from './content';

export const TAG_START = "#";

export class XitCompletionItemProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {
        return new Promise((resolve, reject) => {
            const groups = readContent(document);
            const tags = getAllTags(groups);
            let completionItems: vscode.CompletionItem[] = [];

            for (const tag of tags) {
                const completionItem = new vscode.CompletionItem(tag, vscode.CompletionItemKind.Property);
                completionItems.push(completionItem);
            }

            resolve(completionItems);
        });
    }
}
