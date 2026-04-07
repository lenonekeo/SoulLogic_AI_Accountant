// Format data as a plain-text table for chat messages
export function formatTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length))
  );

  const divider = widths.map((w) => "-".repeat(w)).join(" | ");
  const headerRow = headers.map((h, i) => h.padEnd(widths[i])).join(" | ");
  const dataRows = rows.map((row) =>
    row.map((cell, i) => (cell ?? "").padEnd(widths[i])).join(" | ")
  );

  return [headerRow, divider, ...dataRows].join("\n");
}
