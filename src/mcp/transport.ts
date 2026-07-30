import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createMcpServer } from "./server.js";
import { logger } from "../logging/logger.js";

/**
 * MCP Streamable HTTP requires session continuity: a client sends
 * `initialize` once, gets back an Mcp-Session-Id, then reuses that id on
 * every subsequent tools/list / tools/call for the same connection. So we
 * keep one {server, transport} pair per session, created on initialize and
 * torn down only when the transport actually closes (client disconnect or
 * process exit).
 *
 * Deliberately no idle-timeout eviction here: a real chat client (e.g.
 * Claude Desktop via mcp-remote) holds one session open for the whole
 * conversation, and multi-minute gaps between tool calls are normal, not
 * abandonment. An earlier 30-minute idle TTL silently killed live sessions
 * mid-conversation — and because the MCP client has no way to recover from
 * a dead session on its own (see the 404 handling below), that left the
 * connector permanently broken until Claude Desktop was restarted. For this
 * single-instance demo server, the trade-off (a session that's never
 * explicitly closed stays in memory) is preferable to that failure mode; a
 * production deployment serving untrusted/anonymous clients would want a
 * much longer TTL (hours, not minutes) rather than none at all.
 */
const sessions = new Map<string, StreamableHTTPServerTransport>();

export async function handleMcpRequest(req: Request, res: Response) {
  const sessionId = req.header("mcp-session-id");

  try {
    let transport = sessionId ? sessions.get(sessionId) : undefined;

    if (!transport && isInitializeRequest(req.body)) {
      const server = createMcpServer();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          sessions.set(newSessionId, transport!);
          logger.info({ sessionId: newSessionId }, "MCP session initialized");
        },
      });

      transport.onclose = () => {
        if (transport!.sessionId) {
          sessions.delete(transport!.sessionId);
          logger.info({ sessionId: transport!.sessionId }, "MCP session closed");
        }
        server.close();
      };

      await server.connect(transport);
    } else if (transport) {
      // session already tracked in `sessions`, nothing to do before delegating
    } else {
      // Matches the MCP spec / SDK reference server convention (404 + -32001)
      // for an unknown/expired session, so clients that do implement
      // session-expiry recovery can recognize it — see ARCHITECTURE.md.
      logger.warn({ sessionId }, "Rejected request for unknown/expired MCP session");
      res.status(404).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Session not found" },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    logger.error({ err }, "Failed to handle MCP request");
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
}
