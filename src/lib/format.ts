const dateFormat = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("pl-PL", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDate(value: Date | string | number): string {
  return dateFormat.format(new Date(value)).replace(/\s?r\.$/, "");
}

export function formatDateTime(value: Date | string | number): string {
  const date = new Date(value);
  return `${formatDate(date)} ${timeFormat.format(date)}`;
}

export function today(): Date {
  return new Date();
}

const longDateFormat = new Intl.DateTimeFormat("pl-PL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortWeekdayFormat = new Intl.DateTimeFormat("pl-PL", {
  weekday: "short",
});

export function formatLongDate(value: Date | string | number): string {
  return longDateFormat.format(new Date(value)).replace(/\s?r\.$/, "");
}

export function formatShortWithWeekday(value: Date | string | number): string {
  const date = new Date(value);
  const weekday = shortWeekdayFormat.format(date).replace(/\.$/, "");
  return `${weekday} ${formatDate(date)}`;
}
