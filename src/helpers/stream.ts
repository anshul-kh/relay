import type { Response } from "express";
import fs from "node:fs";
import mime from "mime-types";

export function streamFile(filePath: string, res: Response): void {
  const mimeType = mime.lookup(filePath) || "application/octet-stream";

  res.setHeader("Content-Type", mimeType);

  const stream = fs.createReadStream(filePath);

  stream.on("error", () => {
    if (!res.headersSent) {
      res.status(500).end();
    }
  });

  stream.pipe(res);
}
