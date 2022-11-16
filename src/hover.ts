import * as vscode from 'vscode';
import { readTaskContainingLine } from './content';
import { ItemStatus, MAX_DATE } from './globals';
import { getDayName } from './utils';

export class XitHoverProvider implements vscode.HoverProvider {
    public provideHover(document: vscode.TextDocument, position: vscode.Position, _: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        const task = readTaskContainingLine(document, position.line);

        if (task !== null) {
            const status = task.get_status();
            const due_date = task.get_due_date();
            const day_name = getDayName(due_date);

            if ((status == ItemStatus.Open || status == ItemStatus.Ongoing) && due_date != MAX_DATE) {
                return new vscode.Hover(new vscode.MarkdownString("Due date: " + day_name + ", " + due_date));    
            }
        }
        
        return;
    }
}
