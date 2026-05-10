import config from "config";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { existsSync, readFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer, type Server as HttpsServer } from "node:https";
import { getClientKey } from "./helpers/client";
import type { AppConfig } from "./types/config";
import type { RuntimeServer } from "./types/server";

const appConfig = config.util.toObject() as AppConfig;

/**
 * Creates the Express application and registers global middleware/routes.
 */
export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
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

  return app;
}

/**
 * Boots the configured HTTP or HTTPS server.
 */
export function initServer(): RuntimeServer {
  const app = createApp();
  const server = appConfig.server.secure ? createSecureServer(app) : createHttpServer(app);
  const protocol = appConfig.server.secure ? "https" : "http";

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
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
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
