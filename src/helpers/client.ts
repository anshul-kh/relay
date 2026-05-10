import type { Request } from "express";

type IpNormalizer = (ip: string) => string;

/**
 * Builds a stable client identifier from proxy headers or the request socket.
 */
export function getClientKey(req: Request, normalizeIp: IpNormalizer): string {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (Array.isArray(forwardedFor)) {
    return normalizeClientIp(forwardedFor[0] ?? req.ip ?? req.socket.remoteAddress, normalizeIp);
  }

  if (typeof forwardedFor === "string") {
    return normalizeClientIp(forwardedFor.split(",")[0]?.trim() || req.ip || req.socket.remoteAddress, normalizeIp);
  }

  return normalizeClientIp(req.ip || req.socket.remoteAddress, normalizeIp);
}

/**
 * Normalizes IPv4 and IPv6 addresses into safe rate-limit keys.
 */
function normalizeClientIp(ip: string | undefined, normalizeIp: IpNormalizer): string {
  if (!ip) {
    return "unknown";
  }

  return normalizeIp(ip);
}
