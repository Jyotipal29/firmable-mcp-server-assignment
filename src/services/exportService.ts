import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { InternalError, ValidationError } from "../mcp/errors.js";
import { contactService } from "./contactService.js";

export const EXPORTS_DIR = path.resolve(process.cwd(), "exports");
export const EXPORT_TTL_MS = 60 * 60 * 1000; // 1 hour

const CSV_HEADERS = ["id", "name", "title", "companyId"] as const;

function csvEscape(value: string | null | undefined): string {
  const str = value ?? "";
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: { id: string; name: string; title: string | null; companyId: string }[]): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const row of rows) {
    lines.push(
      [csvEscape(row.id), csvEscape(row.name), csvEscape(row.title), csvEscape(row.companyId)].join(","),
    );
  }
  return lines.join("\n") + "\n";
}

export const exportService = {
  async exportContacts(contactIds: string[]) {
    const rows = await contactService.findManyForExport(contactIds);

    if (rows.length === 0) {
      throw new ValidationError("None of the provided contactIds were found");
    }

    const csv = toCsv(rows);
    const token = randomUUID();
    const fileName = `${token}.csv`;

    try {
      await mkdir(EXPORTS_DIR, { recursive: true });
      await writeFile(path.join(EXPORTS_DIR, fileName), csv, "utf8");
    } catch (err) {
      throw new InternalError("Failed to write export file", err);
    }

    return {
      downloadUrl: `${env.EXPORT_BASE_URL}/exports/${fileName}`,
      matchedCount: rows.length,
      requestedCount: contactIds.length,
    };
  },
};
