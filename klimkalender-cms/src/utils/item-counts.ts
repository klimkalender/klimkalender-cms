
export type ItemStatusCounts = { [key: string]: number };

export function countItemsByStatus<T extends { status: string }>(items: T[]): ItemStatusCounts {
  const statusCounts: { [key: string]: number } = {};
  items.forEach(item => {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
  });
  return statusCounts;
}
