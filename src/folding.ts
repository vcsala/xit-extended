import * as vscode from 'vscode';
import { readContent } from './content';

export class XitFoldingRangeProvider implements vscode.FoldingRangeProvider {
	provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.FoldingRange[] {
		const groups = readContent(document);
		let ranges: vscode.FoldingRange[] = [];

		for (let i = 0; i < groups.length; i++) {
			const group = groups[i];

			if (group.is_task_group()) {
				ranges.push(group.get_folding_range());
			}

			for (let j = 0; j < group.tasks.length; j++) {
				const task = group.tasks[j];

				if (task.start != task.end) {
					ranges.push({start: task.start, end: task.end});
				}
			}
		}

		return ranges;
	}
}

