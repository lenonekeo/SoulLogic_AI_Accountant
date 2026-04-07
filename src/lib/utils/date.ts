import { format, addDays, parseISO, isValid, differenceInDays } from "date-fns";

export function today(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function addPaymentTermsDays(dateStr: string, terms: string): string {
  const date = parseISO(dateStr);
  const match = terms.match(/(\d+)/);
  const days = match ? parseInt(match[1]) : 30;
  return format(addDays(date, days), "yyyy-MM-dd");
}

export function formatDate(dateStr: string, pattern = "MMM d, yyyy"): string {
  if (!dateStr) return "";
  const d = parseISO(dateStr);
  return isValid(d) ? format(d, pattern) : dateStr;
}

export function daysBetween(from: string, to: string): number {
  return differenceInDays(parseISO(to), parseISO(from));
}

export function currentYear(): number {
  return new Date().getFullYear();
}

export function currentMonth(): string {
  return format(new Date(), "yyyy-MM");
}

export function isOverdue(dueDateStr: string): boolean {
  const dueDate = parseISO(dueDateStr);
  return isValid(dueDate) && dueDate < new Date();
}
