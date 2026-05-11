import config from "config";
import type { AppConfig } from "../types/config";

/**
 * Global application context containing shared configuration.
 * This is frozen to prevent accidental mutations at runtime.
 */
export const APP_CONTEXT = {
  appConfig: Object.freeze(config.util.toObject()) as AppConfig,
};
