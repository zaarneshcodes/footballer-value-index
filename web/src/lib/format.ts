/** €200m, €45.5m, €850k, €0 */
export function eur(n: number): string {
  if (n >= 100e6) return `€${Math.round(n / 1e6)}m`;
  if (n >= 1e6) return `€${(n / 1e6).toFixed(1).replace(/\.0$/, "")}m`;
  if (n >= 1e3) return `€${Math.round(n / 1e3)}k`;
  return `€${Math.round(n)}`;
}

/** "2026-06-03" -> "3 Jun 2026" */
export function date(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "2026-06-03" -> "Jun 2031"-style month and year */
export function monthYear(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Season start year -> "2025/26" */
export function season(start: number): string {
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
}
