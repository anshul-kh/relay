import type { NextFunction, Request, Response } from "express";
import { unlink } from "node:fs/promises";
import { GET_PROJECT_QUERY } from "../../graphql/queries/project";
import { GET_USER_CONFIG } from "../../graphql/queries/user";
import { APP_CONTEXT } from "../../lib/context";
import { fetchAsAdmin } from "../../lib/graphql";
import { isBuildRef, UPLOAD_TYPE } from "../../utils/uploads";

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
  };
};

type ApiResponse = {
  status: boolean;
  message: string;
  data: any;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sendResponse(res: Response, httpStatus: number, message: string, data: any = null) {
  const response: ApiResponse = {
    status: httpStatus >= 200 && httpStatus < 300,
    message,
    data,
  };

  return res.status(httpStatus).json(response);
}

function extractUidFromAuthorization(authorization?: string): string | null {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  const [, payload] = token.split(".");
  if (!payload) {
    return UUID_PATTERN.test(token) ? token : null;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "=",
    );
    const decodedPayload = Buffer.from(paddedPayload, "base64").toString("utf8");
    const claims = JSON.parse(decodedPayload);

    return (
      claims.uid ||
      claims.user_id ||
      claims.id ||
      claims.sub ||
      claims["https://hasura.io/jwt/claims"]?.["x-hasura-user-id"] ||
      null
    );
  } catch {
    return null;
  }
}

async function cleanupUploadedFile(req: Request) {
  if (!req.file?.path) {
    return;
  }

  try {
    await unlink(req.file.path);
  } catch (error) {
    console.error("Failed to clean up invalid upload", error);
  }
}

export async function verifyUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authConfig = APP_CONTEXT.appConfig.auth;

  if (authConfig?.bypassTokenCheck) {
    if (!authConfig.userId) {
      return sendResponse(res, 401, "Invalid user");
    }

    req.user = { id: authConfig.userId };
    next();
    return;
  }

  const uid = extractUidFromAuthorization(req.headers.authorization);

  if (!uid) {
    return sendResponse(res, 401, "Invalid user");
  }

  try {
    const result = await fetchAsAdmin(GET_USER_CONFIG, { uid });
    const user = result?.data?.user;
    const hostedProjectsCount = user?.hosted_projects_aggregate?.aggregate?.count ?? 0;
    const maxProjectLimit = APP_CONTEXT.appConfig.uploads.maxProjectLimit;

    if (result?.errors || !user?.is_active) {
      return sendResponse(res, 401, "Invalid user");
    }

    if (hostedProjectsCount >= maxProjectLimit) {
      return sendResponse(res, 403, `Your quota has been exceeded, max ${maxProjectLimit} projects can be hosted.`);
    }

    req.user = { id: uid };
    next();
  } catch (error) {
    console.error("Failed to verify user", error);
    return sendResponse(res, 401, "Invalid user");
  }
}

export async function validateUpload(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const slug = req.body.slug;
  const type = req.body.type || UPLOAD_TYPE.BUILD;

  if (!slug || !req.user?.id) {
    await cleanupUploadedFile(req);
    return sendResponse(res, 400, "Invalid project");
  }

  if (type !== UPLOAD_TYPE.BUILD || !isBuildRef(slug)) {
    await cleanupUploadedFile(req);
    return sendResponse(res, 400, "Invalid action");
  }

  try {
    const result = await fetchAsAdmin(GET_PROJECT_QUERY, { slug });
    const project = result?.data?.site?.[0];

    if (result?.errors || !project || project.user_id !== req.user.id) {
      await cleanupUploadedFile(req);
      return sendResponse(res, 400, "Invalid project");
    }

    next();
  } catch (error) {
    console.error("Failed to validate upload", error);
    await cleanupUploadedFile(req);
    return sendResponse(res, 400, "Invalid project");
  }
}
