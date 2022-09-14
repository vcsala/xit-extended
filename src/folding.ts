import * as vscode from 'vscode';
import { readContent } from './content';

export class XitFoldingRangeProvider implements vscode.FoldingRangeProvider {
	provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.FoldingRange[] {
		const groups = readContent(document);
		let ranges: vscode.FoldingRange[] = [];

		for (const group of groups) {
			if (group.is_task_group()) {
				ranges.push(group.get_folding_range());
			}

			for (const task of group.tasks) {
				if (task.start != task.end) {
					ranges.push({start: task.start, end: task.end});
				}
			}
		}

		return ranges;
	}
}

