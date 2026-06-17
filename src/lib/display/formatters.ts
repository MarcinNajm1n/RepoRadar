import { formatCompactNumber, formatDate } from "@/lib/utils";

export function formatNullableScore(value: number | null | undefined, suffix = "/100") {
  return value === null || value === undefined ? "brak" : `${value}${suffix}`;
}

export function formatStars(value: number) {
  return formatCompactNumber(value);
}

export function formatGrowth(value: number | null | undefined) {
  return value === null || value === undefined ? "zbieramy" : value > 0 ? `+${formatCompactNumber(value)}` : "0";
}

export function formatDisplayDate(value: string | Date | null | undefined) {
  return formatDate(value);
}
