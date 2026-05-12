import type { NextFunction, Request, Response } from "express";
import mime from "mime-types";
import { APP_CONTEXT } from "../lib/context";

const ONE_HOUR_SECONDS = 60 * 60;
const ONE_YEAR_SECONDS = 365 * 24 * ONE_HOUR_SECONDS;

const IMMUTABLE_ASSET_TYPES = new Set([
  "text/css",
  "application/javascript",
  "text/javascript",
  "application/wasm",
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
  "font/otf",
  "font/ttf",
  "font/woff",
  "font/woff2",
  "application/font-woff",
  "application/vnd.ms-fontobject",
]);

/**
 * Applies baseline security headers that are safe for APIs and hosted static apps.
 */
export function applySecurityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (APP_CONTEXT.appConfig.server.secure) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
}

/**
 * Sets Content-Type and cache headers for a static file response.
 */
export function applyStaticFileHeaders(filePath: string, res: Response): void {
  const mimeType = mime.lookup(filePath) || "application/octet-stream";

  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", getCacheControlHeader(mimeType));
}

function getCacheControlHeader(mimeType: string): string {
  if (mimeType === "text/html") {
    return "no-cache";
  }

  if (mimeType === "application/json" || mimeType === "application/manifest+json") {
    return `public, max-age=${ONE_HOUR_SECONDS}`;
  }

  if (IMMUTABLE_ASSET_TYPES.has(mimeType)) {
    return `public, max-age=${ONE_YEAR_SECONDS}, immutable`;
  }

  return `public, max-age=${ONE_HOUR_SECONDS}`;
}
