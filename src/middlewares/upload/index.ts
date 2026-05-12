import type { Request } from "express";
import { APP_CONTEXT } from "../../lib/context";
import multer, { type FileFilterCallback } from "multer";
import path from "path";

const UPLOAD_DIR = APP_CONTEXT.appConfig.storage.uploadsDirectory;

const ALLOWED_MIME_TYPES = ["application/zip", "application/x-zip-compressed"];

const storage = multer.diskStorage({
  destination: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void,
  ) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype) || file.originalname.endsWith(".zip")) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only ZIP files are allowed."));
  }
};

export const upload = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024, files: 1 } }); // 1MB limit
