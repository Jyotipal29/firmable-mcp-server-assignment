import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { logger } from "../logging/logger.js";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // still run timingSafeEqual against a same-length buffer to avoid a
    // length-based timing signal, then treat the result as false.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? "";
  const [scheme, token] = header.split(" ");

  const isValid = scheme === "Bearer" && !!token && safeCompare(token, env.API_KEY);

  if (!isValid) {
    logger.warn({ path: req.path, method: req.method, ip: req.ip }, "Rejected unauthenticated request");
    res.status(401).json({
      error: { code: "unauthorized", message: "Missing or invalid API key" },
    });
    return;
  }

  next();
}
