import type { ClubEvent, Registration } from "@/data/events";

/**
 * Escapes a single CSV cell according to RFC 4180 rules:
 * - If the value contains commas, double quotes, or newlines, wrap in quotes
 * - Escape any internal double quotes by doubling them ("" -> """")
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats a timestamp into an ISO-8601 string or readable date
 */
function formatTimestamp(isoStr?: string | null): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? isoStr : d.toISOString();
  } catch {
    return isoStr;
  }
}

/**
 * Generates RFC 4180 compliant CSV string for tournament registrations.
 * Dynamic form fields follow the exact order in event.form.fields.
 * If colorPicker is disabled, the "Team Color" column is omitted.
 */
export function generateRegistrationsCsv(
  event: ClubEvent,
  registrations: Registration[],
): string {
  // 1. Build headers
  const headers: string[] = [
    "Reference Code",
    "Submitted At",
    ...event.form.fields.map((f) => f.label),
  ];

  if (event.form.colorPicker) {
    headers.push("Team Color");
  }

  headers.push("Payment Screenshot", "Confirmed", "Confirmed At");

  // 2. Build rows
  const rows: string[][] = registrations.map((r) => {
    const row: string[] = [
      r.ref,
      formatTimestamp(r.createdAt),
    ];

    // Dynamic form fields in form.fields order
    for (const field of event.form.fields) {
      const raw = r.values?.[field.id];
      if (Array.isArray(raw)) {
        // Multi-value checkbox joined with "; "
        row.push(raw.join("; "));
      } else if (raw !== undefined && raw !== null) {
        row.push(String(raw));
      } else {
        row.push("");
      }
    }

    // Team Color (if enabled)
    if (event.form.colorPicker) {
      row.push(r.color ?? "");
    }

    // Payment Screenshot note (never embed base64 or raw file payload)
    const hasPayment = Boolean(r.paymentScreenshot && String(r.paymentScreenshot).trim().length > 0);
    row.push(hasPayment ? "Uploaded" : "Not uploaded");

    // Confirmation status & timestamp
    row.push(r.confirmed ? "Yes" : "No");
    row.push(r.confirmedAt ? formatTimestamp(r.confirmedAt) : "");

    return row;
  });

  // 3. Format CSV lines with RFC 4180 escaping
  const csvLines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];

  return csvLines.join("\r\n");
}

/**
 * Returns formatted filename: {event-slug}-registrations-{yyyy-mm-dd}.csv
 */
export function getRegistrationsCsvFilename(eventSlug: string, date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${eventSlug}-registrations-${yyyy}-${mm}-${dd}.csv`;
}

/**
 * Triggers a client-side browser download for the given CSV content with UTF-8 BOM
 */
export function downloadCsv(filename: string, csvContent: string): void {
  // \uFEFF adds a UTF-8 Byte Order Mark so Excel/Numbers automatically recognize special characters
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * High-level one-click export utility
 */
export function exportRegistrationsToCsv(
  event: ClubEvent,
  registrations: Registration[],
): void {
  const csv = generateRegistrationsCsv(event, registrations);
  const filename = getRegistrationsCsvFilename(event.slug);
  downloadCsv(filename, csv);
}
