import path from "path";
import { APP_CONTEXT } from "./context";
import { extractZipSafely } from "../helpers/unzip";

const { appConfig } = APP_CONTEXT;

/**
 * Processes an uploaded build ZIP file for a given project slug, extracting it to the appropriate directory.
 */
export async function processBuildUpload(slug: string, zipPath: string): Promise<boolean> {
  if (!slug || !zipPath) {
    return Promise.reject(new Error("Missing slug or zipPath"));
  }

  const extractRoot = path.join(appConfig.storage.projectsDirectory, slug);
  return extractZipSafely(zipPath, extractRoot);
}
