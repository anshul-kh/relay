import yauzl from "yauzl";
import fs from "fs";
import path from "path";
import { pipeline } from "node:stream/promises";

const MAX_TOTAL_UNCOMPRESSED_SIZE = 20 * 1024 * 1024;

const MAX_FILES = 500;

function safeJoin(root: string, target: string) {
  const destination = path.resolve(root, path.normalize(target));

  if (!destination.startsWith(path.resolve(root))) {
    throw new Error("Invalid zip entry path");
  }

  return destination;
}

export async function extractZipSafely(zipPath: string, extractRoot: string) {
  fs.mkdirSync(extractRoot, {
    recursive: true,
  });

  return new Promise<boolean>((resolve, reject) => {
    let isSettled = false;

    function fail(error: unknown) {
      if (isSettled) return;
      isSettled = true;
      reject(error);
    }

    yauzl.open(
      zipPath,
      {
        lazyEntries: true,
      },
      (err: Error | null, zipFile: yauzl.ZipFile) => {
        if (err || !zipFile) {
          return reject(err);
        }

        let totalSize = 0;
        let totalFiles = 0;

        zipFile.readEntry();

        zipFile.on("entry", (entry: yauzl.Entry) => {
          void (async () => {
            try {
              totalFiles++;

              if (totalFiles > MAX_FILES) {
                throw new Error("Too many files in archive");
              }

              totalSize += entry.uncompressedSize;

              if (totalSize > MAX_TOTAL_UNCOMPRESSED_SIZE) {
                throw new Error("Archive exceeds size limit");
              }

              if (path.isAbsolute(entry.fileName)) {
                throw new Error("Absolute paths not allowed");
              }

              const destination = safeJoin(extractRoot, entry.fileName);

              const isDirectory = /\/$/.test(entry.fileName);

              if (isDirectory) {
                fs.mkdirSync(destination, {
                  recursive: true,
                  mode: 0o755,
                });

                zipFile.readEntry();

                return;
              }

              fs.mkdirSync(path.dirname(destination), {
                recursive: true,
                mode: 0o755,
              });

              await new Promise<void>((resolveStream, rejectStream) => {
                zipFile.openReadStream(entry, (err: Error | null, readStream: NodeJS.ReadableStream) => {
                  if (err || !readStream) {
                    rejectStream(err);
                    return;
                  }

                  const writeStream = fs.createWriteStream(destination, {
                    mode: 0o644,
                  });

                  pipeline(readStream, writeStream).then(resolveStream).catch(rejectStream);
                });
              });

              zipFile.readEntry();
            } catch (error) {
              fail(error);
            }
          })();
        });

        zipFile.on("end", () => {
          if (isSettled) return;
          isSettled = true;
          resolve(true);
        });

        zipFile.on("error", fail);
      },
    );
  });
}
