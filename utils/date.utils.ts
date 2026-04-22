export function getFormattedDate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export function getFormattedTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace('T', ' ').replace(/\..+/, '');
}

export function getLogFileName(): string {
  return `${getFormattedDate()}.log`;
}
