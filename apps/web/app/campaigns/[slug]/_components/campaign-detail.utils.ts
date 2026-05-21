export function formatCurrencyVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VND`;
}

export function formatDateTime(value: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("vi-VN");
}
