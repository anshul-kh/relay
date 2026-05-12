import fs from "node:fs";
import path from "node:path";
import type { ResolvedFilePath } from "../types/path";
import { APP_CONTEXT } from "../lib/context";

const appConfig = APP_CONTEXT.appConfig;

export async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.promises.stat(filePath);
    return stat.isFile();
  } catch (err) {
    console.error(`Error checking file existence: ${filePath}`, err);
    return false;
  }
}

export async function checkWithinProjectDir(absolutePath: string): Promise<boolean> {
  try {
    const result = (await fs.promises.realpath(absolutePath)).startsWith(appConfig.storage.projectsDirectory);
    return !!result;
  } catch (err) {
    return false;
  }
}

/** Finds the file path and checks if it exists, returning a structured result */
async function findFilePath(filePath: string): Promise<ResolvedFilePath> {
  const pathname = decodeURIComponent(filePath);
  const normalizedPath = path.posix.normalize(pathname);

  if (normalizedPath.includes("..") || normalizedPath.includes("/.") || normalizedPath.includes("\0")) {
    return {
      error: "Invalid file path",
      shouldServe: false,
      isFound: false,
      filePath: null,
      status: 400,
    };
  }

  const absolutePath = path.join(appConfig.storage.projectsDirectory, normalizedPath);

  const fileExists = await checkFileExists(absolutePath);
  const isWithinProjectDir = await checkWithinProjectDir(absolutePath);

  if (!fileExists || !isWithinProjectDir) {
    return {
      error: "File not found",
      shouldServe: false,
      isFound: false,
      filePath: null,
      status: 404,
    };
  }

  return {
    error: null,
    shouldServe: true,
    isFound: true,
    filePath: absolutePath,
    status: 200,
  };
}

/** Resolves the file path and returns the resolved file path or an error */
export async function resolveFilePath(filePath: string, slug: string, isSPA: boolean): Promise<ResolvedFilePath> {
  const hasExtension = path.extname(filePath).length > 0;

  const projectBasePath = path.posix.join(slug, filePath);
  if (hasExtension) return findFilePath(projectBasePath);

  const candidates = [];
  candidates.push(projectBasePath);
  candidates.push(path.posix.join(projectBasePath, "index.html"));

  for (const candidate of candidates) {
    const result = await findFilePath(candidate);
    if (result.isFound) {
      return result;
    }
  }

  // fallback for SPA routing: if the requested path doesn't have an extension, try serving index.html from that path
  if (!hasExtension && isSPA) {
    const spaFallbackPath = path.posix.join(slug, "index.html");
    const spaResult = await findFilePath(spaFallbackPath);
    if (spaResult.isFound) {
      return spaResult;
    }
  }

  return {
    error: "File not found",
    shouldServe: false,
    isFound: false,
    filePath: null,
    status: 404,
  };
}

export function createDirectoryIfNotExists(dirPath: string): void {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    console.error(`Error creating directory: ${dirPath}`, err);
    throw err;
  }
}
