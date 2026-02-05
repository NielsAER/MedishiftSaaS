export function stripSeconds(time?: string | null) {
  if (!time) return undefined;
  const parts = time.split(":");
  if (parts.length >= 2) return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  return time;
}

export function subtractMinutes(time: string, minutes: number) {
  // time expected as HH:MM or HH:MM:SS
  const parts = time.split(":");
  const hh = parseInt(parts[0] || "0", 10);
  const mm = parseInt(parts[1] || "0", 10);
  const total = (hh * 60 + mm - minutes + 24 * 60) % (24 * 60);
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}
