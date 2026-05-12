import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { existsSync, readFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer, type Server as HttpsServer } from "node:https";
import { getClientKey } from "./helpers/client";
import type { RuntimeServer } from "./types/server";
import { APP_CONTEXT } from "./lib/context";
import { applySecurityHeaders, serveStaticBuilds } from "./middlewares";
import { createDirectoryIfNotExists } from "./helpers/path";
import { upload } from "./middlewares/upload";
import { processBuildUpload } from "./lib/processBuild";
import { stripProjectSlug } from "./helpers/project";

const { appConfig } = APP_CONTEXT;
/**
 * Creates the Express application and registers global middleware/routes.
 */
export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(applySecurityHeaders);
  app.use(applyCorsHeaders);
  app.use(createRateLimiter());

  app.get("/ping", (_req: Request, res: Response) => {
    res.status(200).json({ message: "pong" });
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      app: appConfig.app.name,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/upload", upload.single("file"), async (req: Request, res: Response) => {
    const slug = req.body.slug;

    if (!slug) {
      return res.status(400).json({ success: false, message: "Invalid hostname" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const zipPath = req.file.path;

    try {
      await processBuildUpload(slug, zipPath);

      res.status(200).json({ success: true, message: "File uploaded successfully", filename: req.file.filename });
    } catch (error) {
      console.error("Failed to process uploaded build", error);
      res.status(500).json({ success: false, message: "Failed to process uploaded build" });
    }
  });

  // catch-all route for  serving static build files
  app.use(serveStaticBuilds);

  return app;
}

/**
 * Boots the configured HTTP or HTTPS server.
 */
export function initServer(): RuntimeServer {
  const app = createApp();
  const server = appConfig.server.secure ? createSecureServer(app) : createHttpServer(app);
  const protocol = appConfig.server.secure ? "https" : "http";

  // create upload directory if they don't exist
  createDirectoryIfNotExists(appConfig.storage.uploadsDirectory);

  server.listen(appConfig.app.port, () => {
    console.info(`${appConfig.app.name} listening on ${protocol}://localhost:${appConfig.app.port}`);
  });

  return server;
}

/**
 * Creates an HTTPS server from configured certificate/key paths.
 */
function createSecureServer(app: Express): HttpsServer {
  const { pubKey, pvtKey } = appConfig.server.https;

  if (!pubKey || !pvtKey) {
    throw new Error("HTTPS is enabled, but server.https.pubKey or server.https.pvtKey is missing.");
  }

  if (!existsSync(pubKey)) {
    throw new Error(`HTTPS public certificate file does not exist: ${pubKey}`);
  }

  if (!existsSync(pvtKey)) {
    throw new Error(`HTTPS private key file does not exist: ${pvtKey}`);
  }

  try {
    return createHttpsServer(
      {
        cert: readFileSync(pubKey),
        key: readFileSync(pvtKey),
      },
      app,
    );
  } catch (error) {
    throw new Error("Failed to create HTTPS server.", { cause: error });
  }
}

/**
 * Applies the configured CORS policy for simple API usage.
 */
function applyCorsHeaders(req: Request, res: Response, next: NextFunction): void {
  res.header("Access-Control-Allow-Origin", appConfig.server.cors);
  res.header("Access-Control-Allow-Methods", "GET,OPTIONS,HEAD,POST");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
}

/**
 * Creates the configured request rate-limiter middleware.
 */
function createRateLimiter() {
  return rateLimit({
    ...appConfig.server.rateLimit,
    keyGenerator: (req) => getClientKey(req, ipKeyGenerator),
    message: { message: "Too many requests. Please try again later." },
  });
}
