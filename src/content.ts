import * as vscode from 'vscode';
import { eliminateDuplicates, range, formatDate, getYearWeekStart } from './utils'

export const DEBUG = false;

export enum ItemStatus {
	Unknown,
	Open,
	Ongoing,
	Completed,
	Obsolete
}

export enum ParsingState {
	Start,
	BlankLine,
	Title,
	TaskHead,
	TaskBody,
	Invalid
}

function shiftStatus(status: ItemStatus): ItemStatus {
	switch (status) {
		case ItemStatus.Open: return ItemStatus.Ongoing;
		case ItemStatus.Ongoing: return ItemStatus.Completed;
		case ItemStatus.Completed: return ItemStatus.Obsolete;
		case ItemStatus.Obsolete: return ItemStatus.Open;
		default: return ItemStatus.Unknown;
	}
}

function toggleStatus(status: ItemStatus): ItemStatus {
	switch (status) {
		case ItemStatus.Open: return ItemStatus.Completed;
		case ItemStatus.Ongoing: return ItemStatus.Completed;
		case ItemStatus.Completed: return ItemStatus.Open;
		case ItemStatus.Obsolete: return ItemStatus.Completed;
		default: return ItemStatus.Unknown;
	}
}

function translateStatus(status: ItemStatus): string {
	switch (status) {
		case ItemStatus.Open: return " ";
		case ItemStatus.Ongoing: return "@";
		case ItemStatus.Completed: return "x";
		case ItemStatus.Obsolete: return "~";
		default: return "?";
	}
}

export function compileStatus(char: string): ItemStatus {
	switch (char) {
		case " ": return ItemStatus.Open;
		case "@": return ItemStatus.Ongoing;
		case "x": return ItemStatus.Completed;
		case "~": return ItemStatus.Obsolete;
	}

	return ItemStatus.Unknown;
}

export function getDate(line: string): { text: string, index: number } {
	const re = /([^\w\s\/-]|[ ])-> ([0-9]{4}|[0-9]{4}-W?[0-9]{2}|[0-9]{4}-Q[0-9]|[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{4}\/W?[0-9]{2}|[0-9]{4}\/Q[0-9]|[0-9]{4}\/[0-9]{2}\/[0-9]{2})([ ]|$|[^\w\s?\/-])/;
	const match = re.exec(line);

	if (match) {
		return { text: match[2].trim().replace("/", "-"), index: match.index + 4 } // ] as const;
	}

	return { text: "", index: -1 };
}

export function getDueDate(date: string): string {
	if (date != "") {
		const match_full = /[0-9]{4}-[0-9]{2}-[0-9]{2}/.exec(date);

		if (match_full) {
			return date;
		}

		const match_month = /[0-9]{4}-[0-9]{2}/.exec(date);

		if (match_month) {
			const year: number = parseInt(date.substring(0, 4));
			const month: number = parseInt(date.substring(5));
			const due_date = new Date(year, month, 0);
			return formatDate(due_date);
		}

		const match_quarter = /[0-9]{4}-Q[0-9]{2}/.exec(date);

		if (match_quarter) {
			const year: number = parseInt(date.substring(0, 4));
			const month: number = parseInt(date.substring(6)) * 3;
			const due_date = new Date(year, month, 0);
			return formatDate(due_date);
		}

		const match_week = /[0-9]{4}-W[0-9]{2}/.exec(date);

		if (match_week) {
			const year: number = parseInt(date.substring(0, 4));
			const week: number = parseInt(date.substring(6));
			let due_date = getYearWeekStart(year);
			due_date.setDate(due_date.getDate() + week * 7 - 1);
			return formatDate(due_date);
		}

		const match_year = /[0-9]{4}/.exec(date);

		if (match_year) {
			const year: number = parseInt(date);
			const month: number = 12;
			const due_date = new Date(year, month, 0);
			return formatDate(due_date);
		}
	}

	return "";
}

export function getPriorityString(text: string): string {
	const match = /(?<=^\[[ x@~]\] )((?:!+\.*)|(?:\.*!+)|(?:\.+))(?: |$)/.exec(text);

	if (match) {
		return match[1].trim();
	}

	return "";
}

function replaceLine(document: vscode.TextDocument, builder: vscode.TextEditorEdit, line_index: number, new_text: string) {
	if (line_index >= 0 && line_index < document.lineCount) {
		const line = document.lineAt(line_index).text;
		const range = new vscode.Range(line_index, 0, line_index, line.length);
		builder.replace(range, new_text);
	}
}

class XitTask {
	lines: string[];
	start: number;
	end: number;

	constructor(text: string, lineNo: number) {
		this.lines = [text];
		this.start = lineNo;
		this.end = lineNo;
	}

	add_line(text: string) {
		this.lines.push(text);
		this.end++;
	}

	get_text(): string {
		return this.lines.join();
	}

	get_status(): ItemStatus {
		const text = this.get_text();

		if (text.startsWith("[")) {
			return compileStatus(text.charAt(1));
		}

		return ItemStatus.Unknown;
	}

	set_status(status: ItemStatus) {
		let line = this.lines[0];
		let char = translateStatus(status);

		if (char != "?") {
			line = line.replace(line.substring(0, 3), "[" + char + "]");
		}

		this.lines[0] = line;
	}

	shift_status() {
		const status = this.get_status();
		const new_status = shiftStatus(status);
		this.set_status(new_status);
	}

	toggle_status() {
		const status = this.get_status();
		const new_status = toggleStatus(status);
		this.set_status(new_status);
	}

	get_priority(): number {
		const prio_str = getPriorityString(this.get_text());

		if (prio_str != "") {
			return (prio_str.match(/!/g) || []).length;
		}

		return 0;
	}

	set_priority(new_priority: string) {
		let line = this.lines[0];

		const match = /(?<=^\[[ x@~]\] )(?:(?:!+\.*)|(?:\.*!+)|(?:\.+))/.exec(line);

		if (match) {
			if (new_priority == "") {
				line = line.replace(match[0].trim() + " ", "");
			} else {
				line = line.replace(match[0].trim(), new_priority);
			}
		} else {
			line = line.substring(0, 4) + new_priority + " " + line.substring(4);
		}

		this.lines[0] = line;
	}

	increase_priority() {
		let priority = getPriorityString(this.get_text());

		if (priority.startsWith("!")) {
			priority = "!" + priority;
		} else {
			priority = priority + "!";
		}

		this.set_priority(priority);
	}

	decrease_priority() {
		if (this.get_priority() > 0) {
			let priority = getPriorityString(this.get_text());

			if (priority.startsWith("!")) {
				priority = priority.substring(1);
			} else {
				priority = priority.substring(0, priority.length - 1);
			}

			this.set_priority(priority);
		}
	}

	get_date(): string {
		const date_match = getDate(this.get_text());

		if (date_match.index > 0) {
			return date_match.text;
		}

		return "";
	}

	get_due_date(): string {
		const date = this.get_date();
		return getDueDate(date);
	}

	get_tags(): string[] {
		const re = /#([\p{L}\p{N}_\-]+)(?:=[\p{L}\p{N}_\-]+|="[^"\n]*"|='[^'\n]*')?/ug;
		const text = this.get_text();
		let output: string[] = []

		for (let line of this.lines) {
			let match = re.exec(text);

			while (match) {
				const tag = match[1];

				if (tag != "") {
					output.push(tag);
				}

				match = re.exec(text);
			}
		}

		return output;
	}

	update_task(document: vscode.TextDocument, builder: vscode.TextEditorEdit) {
		let index = 0;

		for (let i = this.start; i <= this.end; i++) {
			let line = this.lines[index];
			replaceLine(document, builder, i, line);
			index++;
		}
	}

	to_string(): string {
		if (DEBUG && this.lines.length > 0) {
			this.lines[0] = this.lines[0] + " | date: " + this.get_date();
		}

		return this.lines.join("\n");
	}
}

class XitGroup {
	header: string[];
	tasks: XitTask[];
	title: string;
	start: number;
	title_row: number;
	start_tasks: number;
	end: number;

	constructor() {
		this.header = [];
		this.tasks = [];
		this.start = -1;
		this.title_row = -1;
		this.start_tasks = -1;
		this.end = -1;
		this.title = "<unnamed group>";
	}

	is_task_group(): boolean {
		return (this.tasks.length > 0);
	}

	get_header_row(): number {
		return (this.title_row < 0) ? this.start_tasks : this.title_row;
	}

	get_folding_range(): vscode.FoldingRange {
		return { start: this.get_header_row(), end: this.end };
	}

	get_symbol(document: vscode.TextDocument): vscode.SymbolInformation {
		const line = document.lineAt(this.get_header_row());

		const output = {
			name: this.title,
			kind: vscode.SymbolKind.Key,
			containerName: "",
			location: new vscode.Location(document.uri, line.range)
		}

		return output;
	}

	add_header(text: string, lineNo: number) {
		this.header.push(text);

		if (this.start < 0) {
			this.start = lineNo;
		}

		this.end = lineNo;

		if (text.trim() != "" && this.title_row < 0) {
			this.title_row = lineNo;
			this.title = text;
		}
	}

	add_task(task: XitTask) {
		this.tasks.push(task);

		if (this.start < 0) {
			this.start = task.start;
		}

		if (this.start_tasks < 0) {
			this.start_tasks = task.start;
		}

		this.end = task.end;
	}

	sort_tasks() {
		this.tasks.sort(compareTasks);
	}

	delete_tasks(): XitTask[] {
		const deleted_tasks = this.tasks.filter((element) => (element.get_status() == ItemStatus.Completed || element.get_status() == ItemStatus.Obsolete));
		this.tasks = this.tasks.filter((element) => (element.get_status() != ItemStatus.Completed && element.get_status() != ItemStatus.Obsolete));
		return deleted_tasks;
	}

	get_all_tags(): string[] {
		let all_tags = this.tasks.map(task => task.get_tags()).flat();
		all_tags = eliminateDuplicates(all_tags);
		return all_tags;
	}

	to_string(): string {
		const header = this.header.join("\n");

		if (this.is_task_group()) {
			const body = this.tasks.map((task) => task.to_string()).join("\n");
			return [header, body].join("\n");
		}

		return header;
	}
}

function compareTasks(a: XitTask, b: XitTask): number {
	let a_due_date = a.get_due_date();
	let b_due_date = b.get_due_date();
	const a_priority = a.get_priority();
	const b_priority = b.get_priority();

	a_due_date = (a_due_date == "") ? "9999-99-99" : a_due_date;
	b_due_date = (b_due_date == "") ? "9999-99-99" : b_due_date;

	if (a_due_date < b_due_date) {
		return -1;
	}

	if (a_due_date > b_due_date) {
		return 1;
	}

	if (a_priority > b_priority) {
		return -1;
	}

	if (a_priority < b_priority) {
		return 1;
	}

	return 0
}

export function readContent(document: vscode.TextDocument): XitGroup[] {
	const re = /^\[[ x@~]\](?: |$)/;

	let groups: XitGroup[] = [];
	let current_group: XitGroup | null = null;
	let current_task: XitTask | null = null;

	for (let i = 0; i < document.lineCount; i++) {
		const line = document.lineAt(i);
		const match = re.exec(line.text);
		if (match) {
			if (current_task === null) {
				current_task = new XitTask(line.text, i);
			}
			else {
				if (current_group === null) {
					current_group = new XitGroup();
				}
				current_group?.add_task(current_task);
				current_task = new XitTask(line.text, i);
			}
		}
		else if (line.text.startsWith("    ") && line.text.trim() != "") {
			current_task?.add_line(line.text);
		}
		else if (line.text.trim() == "") {
			if (current_group === null) {
				current_group = new XitGroup();
			} else {
				if (current_task !== null) {
					current_group.add_task(current_task);
					current_task = null;
				}
				groups.push(current_group);
				current_group = new XitGroup();
			}

			current_group.add_header(line.text, i);
		}
		else { // title
			if (current_group === null) {
				current_group = new XitGroup();
			} else {
				if (current_task !== null) {
					current_group.add_task(current_task);
					current_task = null;
					groups.push(current_group);
					current_group = new XitGroup();
				}
			}

			current_group.add_header(line.text, i);
		}
	}

	if (current_group !== null) {
		if (current_task !== null) {
			current_group.add_task(current_task);
		}

		groups.push(current_group);
	}

	return groups;
}

export function getAllTags(groups: XitGroup[]): string[] {
	let all_tags = groups.map(group => group.get_all_tags()).flat();
	all_tags = eliminateDuplicates(all_tags);
	return all_tags;
}

function getSelectedLines(editor: vscode.TextEditor) {
	return eliminateDuplicates(
		editor.selections
			.flatMap(selection => range(selection.start.line, selection.end.line))
			.sort()
	);
}

function findFirstLine(document: vscode.TextDocument, line: number): number {
	let index = line;

	while (index > 0) {
		const text = document.lineAt(index).text;

		const match = /^\[([^\]])*\]/.exec(text);

		if (match) {
			return index;
		}

		const match_indented = /^ {4}\S/.exec(text);

		if (!match_indented) {
			return -1;
		}

		index--;
	}

	return -1;
}

function readTask(document: vscode.TextDocument, line_no: number): XitTask | null {
	let index = line_no;

	let line = index < document.lineCount ? document.lineAt(index).text : "";
	let current_task: XitTask | null = null;

	if (line.startsWith("\[")) {
		current_task = new XitTask(line, index);
		index++;
	} else {
		return null;
	}

	line = index < document.lineCount ? document.lineAt(index).text : "";

	while (index < document.lineCount && line.startsWith("    ") && line.trim() != "") {
		current_task?.add_line(document.lineAt(index).text);
		index++;
		line = index < document.lineCount ? document.lineAt(index).text : "";
	}

	return current_task;
}

export function readSelectedTasks(editor: vscode.TextEditor): XitTask[] {
	const lines = getSelectedLines(editor);

	let new_lines: number[] = [];

	for (const line of lines) {
		const text = editor.document.lineAt(line).text;

		const match = /^\[([^\]])*\]/.exec(text);
		if (match) {
			new_lines.push(line);
			continue;
		};

		const match_indented = /^ {4}\S/.exec(text);
		if (match_indented) {
			const first_line = findFirstLine(editor.document, line);

			if (first_line > 0 && lines.indexOf(first_line) < 0 && new_lines.indexOf(first_line) < 0) {
				new_lines.push(first_line);
			}

			continue;
		}
	}

	let tasks: XitTask[] = [];

	for (const line of new_lines) {
		const item = readTask(editor.document, line);

		if (item !== null) {
			tasks.push(item);
		}
	}

	return tasks;
}

function groupsToString(groups: XitGroup[]): string {
	return groups.map((group) => group.to_string()).join("\n");
}

export function replaceAll(document: vscode.TextDocument, builder: vscode.TextEditorEdit, groups: XitGroup[]) {
	const content = groupsToString(groups);
	let end_char = document.lineAt(document.lineCount - 1).text.length;
	var range = new vscode.Range(0, 0, document.lineCount - 1, end_char);
	builder.replace(range, content)
}

export function selectionHasCheckboxes(editor: vscode.TextEditor) {
	const lines = getSelectedLines(editor);

	for (const line of lines) {
		const text = editor.document.lineAt(line).text;
		const match = /^\[([^\]])\]/.exec(text);
		const match_indented = /^ {4}\S/.exec(text);
		if (match || match_indented) return true;
	}

	return false;
}
