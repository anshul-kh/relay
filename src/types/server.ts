import type { Server as HttpServer } from "node:http";
import type { Server as HttpsServer } from "node:https";

export type RuntimeServer = HttpServer | HttpsServer;
