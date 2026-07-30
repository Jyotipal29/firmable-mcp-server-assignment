import { Router } from "express";
import { stat, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { EXPORTS_DIR, EXPORT_TTL_MS } from "../services/exportService.js";
import { logger } from "../logging/logger.js";

const UUID_CSV_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.csv$/i;

export const exportsRouter = Router();

// Serves exported CSVs at an unguessable, unauthenticated URL with a short TTL.
// See ARCHITECTURE.md "Export flow" for the rationale on why this route
// intentionally sits outside the Bearer auth middleware.
exportsRouter.get("/exports/:file", async (req, res) => {
  const { file } = req.params;

  if (!UUID_CSV_RE.test(file ?? "")) {
    res.status(404).json({ error: { code: "not_found", message: "Export not found" } });
    return;
  }

  const filePath = path.join(EXPORTS_DIR, file!);

  try {
    const stats = await stat(filePath);
    const ageMs = Date.now() - stats.mtimeMs;
    if (ageMs > EXPORT_TTL_MS) {
      res.status(404).json({ error: { code: "not_found", message: "Export link has expired" } });
      return;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="contacts-export.csv"`);
    res.sendFile(filePath);
  } catch {
    res.status(404).json({ error: { code: "not_found", message: "Export not found" } });
  }
});

async function sweepExpiredExports() {
  try {
    const files = await readdir(EXPORTS_DIR);
    const now = Date.now();
    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(EXPORTS_DIR, file);
        const stats = await stat(filePath);
        if (now - stats.mtimeMs > EXPORT_TTL_MS) {
          await unlink(filePath);
          logger.debug({ file }, "Swept expired export");
        }
      }),
    );
  } catch {
    // exports dir may not exist yet if nothing has been exported
  }
}

export function startExportSweep() {
  const interval = setInterval(sweepExpiredExports, 10 * 60 * 1000);
  interval.unref();
  return interval;
}
