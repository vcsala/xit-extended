import { writeFileSync } from 'fs';

export function syncWriteFile(filename: string, data: any) {
	writeFileSync(filename, data, { flag: 'a' });
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

export function getYearStart(year: number): Date {
	let year_start = new Date(year, 0, 1);
	const year_start_day = year_start.getDay();

	if (year_start_day > 0 && year_start_day <= 4) {
		year_start.setDate(year_start.getDate() - year_start_day + 1);
	} else if (year_start_day == 0) {
		year_start.setDate(year_start.getDate() + 1);
	} else {
		year_start.setDate(year_start.getDate() + 8 - year_start_day);
	}

	return new Date(year_start);
}

export function getCurrentPeriod(period: string): string {
	// TODO: implement
	if (period == "week") {

	} else if (period == "month") {

	} else if (period == "quarter") {

	} else if (period == "year") {

	}

	return getToday();
}