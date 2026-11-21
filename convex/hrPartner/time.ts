// Calendar day in Poland, so late-evening work keeps the local date.
export function todayIso(now: number): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(
    now,
  );
}
