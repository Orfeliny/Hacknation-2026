// Calendar arithmetic on YYYY-MM-DD strings in UTC, so time zones never shift a deadline.

const DAY_MS = 86_400_000;

function parse(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error(`Invalid date: ${date}`);
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const value = new Date(Date.UTC(y, m - 1, d));
  if (value.getUTCDate() !== d) throw new Error(`Invalid date: ${date}`);
  return value;
}

function format(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function addDays(date: string, days: number): string {
  return format(new Date(parse(date).getTime() + days * DAY_MS));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / DAY_MS);
}

// Kodeks cywilny art. 112: the term ends on the matching day, or on the last day of a shorter month.
export function addMonths(date: string, months: number): string {
  const d = parse(date);
  const target = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1),
  );
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return format(target);
}

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

// Public holidays in Poland (ustawa o dniach wolnych od pracy); 24 December is one since 2025.
export function publicHolidays(year: number): Set<string> {
  const fixed = [
    "01-01",
    "01-06",
    "05-01",
    "05-03",
    "08-15",
    "11-01",
    "11-11",
    "12-25",
    "12-26",
  ];
  if (year >= 2025) fixed.push("12-24");
  const easter = format(easterSunday(year));
  return new Set([
    ...fixed.map((md) => `${year}-${md}`),
    easter,
    addDays(easter, 1),
    addDays(easter, 49),
    addDays(easter, 60),
  ]);
}

export function isWorkingDay(date: string): boolean {
  const weekday = parse(date).getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return !publicHolidays(Number(date.slice(0, 4))).has(date);
}

// Kodeks cywilny art. 115: a term ending on a Saturday or a day off ends on the next working day.
export function nextWorkingDay(date: string): string {
  let day = date;
  while (!isWorkingDay(day)) day = addDays(day, 1);
  return day;
}

export type Period = { from: string; to: string };

// Consecutive justified absences form one when only days off separate them (KPRM note).
export function mergeContinuousAbsences(periods: Period[]): Period[] {
  const sorted = [...periods].sort((a, b) => compareDates(a.from, b.from));
  const merged: Period[] = [];
  for (const period of sorted) {
    const last = merged.at(-1);
    if (last && bridgedByDaysOff(last.to, period.from)) {
      if (compareDates(period.to, last.to) > 0) last.to = period.to;
    } else {
      merged.push({ ...period });
    }
  }
  return merged;
}

function bridgedByDaysOff(end: string, nextStart: string): boolean {
  if (compareDates(nextStart, addDays(end, 1)) <= 0) return true;
  for (
    let day = addDays(end, 1);
    compareDates(day, nextStart) < 0;
    day = addDays(day, 1)
  ) {
    if (isWorkingDay(day)) return false;
  }
  return true;
}

// "Dłużej niż miesiąc": the absence still lasts on the day one month after it began.
export function lastsLongerThanMonths(period: Period, months: number): boolean {
  return compareDates(period.to, addMonths(period.from, months)) >= 0;
}

export function lengthInDays(period: Period): number {
  return daysBetween(period.from, period.to) + 1;
}
