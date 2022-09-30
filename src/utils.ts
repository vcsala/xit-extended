import { writeFileSync } from 'fs';

export function syncWriteFile(filename: string, data: any) {
	writeFileSync(filename, data, {flag: 'a'});
}

export function eliminateDuplicates<T extends unknown[]>(array: T): T {
	return Array.from(new Set(array)) as T;
}

export function range(min: number, max: number) {
	return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

function pad(n: number, size: number): string {
	let ns = n.toString();
	while (ns.length < size) ns = "0" + ns;
	return ns;
}

export function formatDate(date: Date): string {
	return pad(date.getFullYear(), 4) + "-" + pad(date.getMonth() + 1, 2) + "-" + pad(date.getDate(), 2);
}

export function getToday(): string {
	let today = new Date();
	return formatDate(today);
}
