export type CsvCell = string | number | boolean | null | undefined;

export function escapeCsvCell(value: CsvCell) {
  if (value === null || typeof value === "undefined") return "";
  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, "\"\"")}"`;
}

export function rowsToCsv(rows: CsvCell[][]) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

export function csvResponse(csv: string, fileName: string) {
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
