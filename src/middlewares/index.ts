import type { Request, Response } from "express";
import { handleBuildServe } from "./serve";

export function serveStaticBuilds(req: Request, res: Response) {
  if (!["GET", "HEAD"].includes(req.method)) {
    return res.set("Allow", "GET, HEAD").sendStatus(405).end();
  }

  return handleBuildServe(req, res);
}

export { applySecurityHeaders, applyStaticFileHeaders } from "./headers";
