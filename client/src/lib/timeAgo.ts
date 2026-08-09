export function timeAgo(dateString: string | null): string {
  if (!dateString) return "";
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  const units: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [30, "day"],
    [12, "month"],
    [Infinity, "year"],
  ];
  let value = seconds;
  for (const [limit, unit] of units) {
    if (value < limit) {
      const rounded = Math.floor(value);
      return `${rounded} ${unit}${rounded !== 1 ? "s" : ""} ago`;
    }
    value = Math.floor(value / limit);
  }
  return "";
}
