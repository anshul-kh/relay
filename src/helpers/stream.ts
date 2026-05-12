import type { Response } from "express";
import fs from "node:fs";
import { applyStaticFileHeaders } from "../middlewares";

export function streamFile(filePath: string, res: Response): void {
  applyStaticFileHeaders(filePath, res);

  const stream = fs.createReadStream(filePath);

  stream.on("error", () => {
    if (!res.headersSent) {
      res.status(500).end();
    }
  });

  stream.pipe(res);
}
