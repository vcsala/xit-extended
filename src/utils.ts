import { match } from 'assert';
import { writeFileSync } from 'fs';

const MS_IN_DAYS = 24 * 60 * 60 * 1000;

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
	const today = new Date();
	return formatDate(today);
}

export function getYearWeekStart(year: number): Date {
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

export function getYearLastWeek(year: number): number {
	let year_end = new Date(year, 12, 0);
	const year_end_day = year_end.getDay();

	if (year_end_day >= 0 && year_end_day < 4) {
		year_end.setDate(year_end.getDate() - year_end_day);
	} else {
		year_end.setDate(year_end.getDate() + 7 - year_end_day);
	}

	year_end = new Date(year_end);

	const days_between = (year_end.getTime() - getYearWeekStart(year).getTime()) / MS_IN_DAYS;

	return Math.trunc(days_between / 7) + 1;
}

export function getCurrentPeriod(period: string): string {
	const today = new Date();
	const year = "-> " + today.getFullYear().toString();

	if (period == "week") {
		const days_between = (today.getTime() - getYearWeekStart(today.getFullYear()).getTime()) / MS_IN_DAYS;
		const week = Math.trunc(days_between / 7) + 1
		return year + "-W" + pad(week + 1, 2);
	} else if (period == "month") {
		return year + "-" + pad(today.getMonth() + 1, 2);
	} else if (period == "quarter") {
		const quarter = (Math.trunc(today.getMonth() / 3) + 1).toString();
		return year + "-Q" + quarter;
	} else if (period == "year") {
		return year;
	}

	return getToday();
}