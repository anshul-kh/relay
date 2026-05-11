import type { Request, Response } from "express";
import { handleBuildServe } from "./serve";

export function serveStaticBuilds(req: Request, res: Response) {
  if (!["GET", "HEAD"].includes(req.method)) {
    return res.send(405).end();
  }

  return handleBuildServe(req, res);
}
