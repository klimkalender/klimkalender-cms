export function sortByDate(dateA: string | Date, dateB: string | Date): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return a - b;
}