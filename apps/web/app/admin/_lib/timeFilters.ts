export type TimeFilter =
  | "ALL"
  | "THIS_MONTH"
  | "THIS_QUARTER"
  | "LAST_MONTH"
  | "Q1"
  | "Q2"
  | "Q3"
  | "Q4"
  | "THIS_YEAR";

export type DateRange = {
  start: Date | null;
  end: Date | null;
};

export const timeFilterOptions: { key: TimeFilter; label: string }[] = [
  { key: "ALL", label: "Tất cả thời gian" },
  { key: "THIS_MONTH", label: "Tháng này" },
  { key: "THIS_QUARTER", label: "Quý này" },
  { key: "LAST_MONTH", label: "Tháng trước" },
  { key: "Q1", label: "Quý 1" },
  { key: "Q2", label: "Quý 2" },
  { key: "Q3", label: "Quý 3" },
  { key: "Q4", label: "Quý 4" },
  { key: "THIS_YEAR", label: "Năm hiện tại" }
];

export function getDateRangeByFilter(filter: TimeFilter, now = new Date()): DateRange {
  const year = now.getFullYear();
  const month = now.getMonth();

  if (filter === "ALL") return { start: null, end: null };
  if (filter === "THIS_MONTH") return { start: new Date(year, month, 1), end: new Date(year, month + 1, 1) };
  if (filter === "THIS_QUARTER") {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    return { start: new Date(year, quarterStartMonth, 1), end: new Date(year, quarterStartMonth + 3, 1) };
  }
  if (filter === "LAST_MONTH") return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
  if (filter === "THIS_YEAR") return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };

  const quarterStartMonth = ({ Q1: 0, Q2: 3, Q3: 6, Q4: 9 } as const)[filter];
  return { start: new Date(year, quarterStartMonth, 1), end: new Date(year, quarterStartMonth + 3, 1) };
}

export function isWithinDateRange(value: string | Date | null | undefined, range: DateRange) {
  if (!range.start && !range.end) return true;
  if (!value) return false;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  if (range.start && date < range.start) return false;
  if (range.end && date >= range.end) return false;
  return true;
}

export function isInCurrentMonth(value: string | Date | null | undefined, now = new Date()) {
  return isWithinDateRange(value, getDateRangeByFilter("THIS_MONTH", now));
}
