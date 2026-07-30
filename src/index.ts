import express from "express";
import { env } from "./config/env.js";
import { logger } from "./logging/logger.js";
import { authMiddleware } from "./middleware/auth.js";
import { handleMcpRequest } from "./mcp/transport.js";
import { exportsRouter, startExportSweep } from "./http/exportsRoute.js";

const app = express();

app.use(express.json());

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Exports are intentionally outside the Bearer auth gate — see
// ARCHITECTURE.md "Export flow" for why.
app.use(exportsRouter);

app.all("/mcp", authMiddleware, handleMcpRequest);

app.use((req, res) => {
  res.status(404).json({ error: { code: "not_found", message: `No route for ${req.method} ${req.path}` } });
});

startExportSweep();

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Account Intelligence Platform MCP server listening");
});
