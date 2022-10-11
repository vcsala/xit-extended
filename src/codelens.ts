import * as vscode from 'vscode';
import { readContent } from './content';
import { ItemStatus } from './globals';
import { getToday, getTomorrow } from './utils';

export class XitCodeLensProvider implements vscode.CodeLensProvider  {
    public provideCodeLenses(document: vscode.TextDocument, _: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        let codeLenses: vscode.CodeLens[] = [];
        const today = getToday();
        const tomorrow = getTomorrow();
        const groups = readContent(document);

        for (const group of groups) {
            for (const task of group.tasks) {
                const status = task.get_status();

                if (status == ItemStatus.Open || status == ItemStatus.Ongoing) {
                    let title = "";
                    let tooltip = "";
                    const due_date = task.get_due_date();
    
                    if (due_date < today) {
                        title = "Overdue"
                        tooltip = "The item is already overdue"
                    } else if (due_date == today) {
                        title = "Today"
                        tooltip = "The item is due today"
                    } else if (due_date == tomorrow) {
                        title = "Tomorrow"
                        tooltip = "The item is due tomorrow"
                    }
    
                    if (title != "") {
                        const line_no = task.start;
                        const line = document.lineAt(line_no).text;
                        const range = new vscode.Range(line_no, 0, line_no, line.length);
                        const command = {
                            title: title,
                            tooltip: tooltip,
                            command: "",
                            arguments: []
                        };
                        codeLenses.push(new vscode.CodeLens(range, command));
                    }    
                }
            }
        }

        return codeLenses;
    }
}
