import { writeFileSync } from 'fs';
import * as globals from './globals'

const MS_IN_DAYS = 24 * 60 * 60 * 1000;

export enum Period {
	Day,
	Week,
	Month,
	Quarter,
	Year
}

export function daysInMonth(year: number, month: number): number {
	switch (month) {
		case 2:
			return (year % 4 == 0 && year % 100) || year % 400 == 0 ? 29 : 28;
		case 9: case 4: case 6: case 11:
			return 30;
		default:
			return 31
	}
}

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

export function getNumberOfWeeks(year: number): number {
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

export function getCurrentPeriod(period: Period): string {
	const today = new Date();
	const year = "-> " + today.getFullYear().toString();

	switch (period) {
		case Period.Week:
			const days_between = (today.getTime() - getYearWeekStart(today.getFullYear()).getTime()) / MS_IN_DAYS;
			const week = Math.trunc(days_between / 7) + 1
			return year + "-W" + pad(week + 1, 2);

		case Period.Month:
			return year + "-" + pad(today.getMonth() + 1, 2);

		case Period.Quarter:
			const quarter = (Math.trunc(today.getMonth() / 3) + 1).toString();
			return year + "-Q" + quarter;

		case Period.Year:
			return year;
	}

	return "-> " + getToday();
}

export function replacePart(text: string, new_part: string, start: number): string {
	const length = text.length;
	const part_length = new_part.length;

	return text.substring(0, start) + new_part + text.substring(start + part_length, length);
}

export function changeDate(date: string, delta: number): string {
	if (date != "") {
		const match_full = globals.FULL_DATE_MASK.exec(date);

		if (match_full) {
			let year: number = parseInt(date.substring(0, 4));
			let month: number = parseInt(date.substring(5, 7));
			let day: number = parseInt(date.substring(8)) + delta;

			if (day > daysInMonth(year, month)) {
				month++;

				if (month > 12) {
					year++;
					month = 1;
				}

				day = 1;
			} else if (day < 1) {
				month--;

				if (month < 1) {
					year--;
					month = 12;
				}

				day = daysInMonth(year, month);
			}

			return pad(year, 4) + "-" + pad(month, 2) + "-" + pad(day, 2);
		}

		const match_month = globals.MONTH_MASK.exec(date);

		if (match_month) {
			let year: number = parseInt(date.substring(0, 4));
			let month: number = parseInt(date.substring(5)) + delta;

			if (month > 12) {
				year++;
				month = 1;
			} else if (month < 1) {
				year--;
				month = 12;
			}

			return pad(year, 4) + "-" + pad(month, 2);
		}

		const match_quarter = globals.QUARTER_MASK.exec(date);

		if (match_quarter) {
			let year: number = parseInt(date.substring(0, 4));
			let quarter: number = parseInt(date.substring(6)) + delta;

			if (quarter > 4) {
				year++;
				quarter = 1;
			} else if (quarter < 1) {
				year--;
				quarter = 4;
			}

			return pad(year, 4) + "-Q" + quarter.toString();
		}

		const match_week = globals.WEEK_MASK.exec(date);

		if (match_week) {
			let year: number = parseInt(date.substring(0, 4));
			let week: number = parseInt(date.substring(6)) + delta;

			if (week > getNumberOfWeeks(year)) {
				year++;
				week = 1;
			} else if (week < 1) {
				year--;
				week = getNumberOfWeeks(year);
			}

			return pad(year, 4) + "-W" + pad(week, 2);
		}

		const match_year = globals.YEAR_MASK.exec(date);

		if (match_year) {
			let year: number = parseInt(date) + delta;
			return pad(year, 4);
		}
	}

	return "";
}

function isValid(year: number, month: number, day: number): boolean {
	return month >= 1 && month <= 12 && day > 0 && day <= daysInMonth(year, month);
}

export function checkDate(date: string): string {
	const match_full = globals.FULL_DATE_MASK.exec(date);

	if (match_full) {
		const year: number = parseInt(date.substring(0, 4));
		const month: number = parseInt(date.substring(5, 7));
		const day: number = parseInt(date.substring(8));

		if (!isValid(year, month, day)) {
			return "Invalid month or day";
		}
	}

	const match_month = globals.MONTH_MASK.exec(date);

	if (match_month) {
		const year: number = parseInt(date.substring(0, 4));
		const month: number = parseInt(date.substring(5));

		if (month < 1 || month > 12) {
			return "Invalid month";
		}
	}

	const match_quarter = globals.QUARTER_MASK.exec(date);

	if (match_quarter) {
		const year: number = parseInt(date.substring(0, 4));
		const quarter: number = parseInt(date.substring(6));

		if (quarter < 1 || quarter > 4) {
			return "Invalid quarter";
		}
	}

	const match_week = globals.WEEK_MASK.exec(date);

	if (match_week) {
		const year: number = parseInt(date.substring(0, 4));
		const week: number = parseInt(date.substring(6));
		const max_week: number = getNumberOfWeeks(year);

		if (week < 1 || week > max_week) {
			return "Invalid week number";
		}
	}

	return "";
}

export function IsValidDate(date: string): boolean {
	return (checkDate(date) == "");
}