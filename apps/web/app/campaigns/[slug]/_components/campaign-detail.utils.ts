export function formatCurrencyVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VND`;
}

export function formatDateTime(value: string | null) {
  if (!value) return "Không có";
  return new Date(value).toLocaleString("vi-VN");
}
