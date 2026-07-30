import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";
import { logger } from "../logging/logger.js";
import { isDomainError } from "./errors.js";

function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function textResult(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

/**
 * Wraps a tool handler so every failure mode (validation, domain, unexpected)
 * comes back as a well-formed MCP tool result instead of a thrown exception
 * or a raw stack trace reaching the client.
 */
export function withToolErrorHandling<Input>(
  toolName: string,
  handler: (input: Input) => Promise<unknown>,
): (input: Input) => Promise<CallToolResult> {
  return async (input: Input) => {
    const start = Date.now();
    const log = logger.child({ toolName });
    try {
      const result = await handler(input);
      log.info({ durationMs: Date.now() - start, outcome: "success" }, "Tool call succeeded");
      return textResult(result);
    } catch (err) {
      const durationMs = Date.now() - start;

      if (err instanceof ZodError) {
        log.warn({ durationMs, outcome: "error", errorCode: "validation_error" }, "Tool call validation failed");
        return errorResult(`Invalid input: ${err.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
      }

      if (isDomainError(err)) {
        const level = err.code === "internal_error" ? "error" : "warn";
        log[level]({ durationMs, outcome: "error", errorCode: err.code, err }, "Tool call failed");
        return errorResult(err.message);
      }

      log.error({ durationMs, outcome: "error", errorCode: "internal_error", err }, "Unexpected tool call error");
      return errorResult("Internal error, please try again");
    }
  };
}
