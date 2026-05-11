import { APP_CONTEXT } from "../lib/context";

/**
 * Strips the project slug from the hostname, validating against the configured domain.
 */
export function stripProjectSlug(hostname: string) {
  const regex = /^(?<subdomain>[a-zA-Z0-9-]+)\.(?<domain>[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;

  const { appConfig } = APP_CONTEXT;

  const match = hostname.match(regex);

  if (!match?.groups) {
    throw new Error("Invalid hostname");
  }

  const { subdomain, domain } = match.groups;

  if (domain !== appConfig.app.domain) {
    throw new Error("Hostname does not match configured domain");
  }

  return subdomain;
}
