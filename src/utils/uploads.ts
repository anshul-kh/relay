import { CREATE_UPLOAD_MUTATION, GET_UPLOAD_BY_REF_QUERY, UPDATE_UPLOAD_MUTATION } from "../graphql/queries/upload";
import { fetchAsAdmin } from "../lib/graphql";

export const UPLOAD_STATUS = {
  UPLOADED: "uploaded",
  PROCESSING: "processing",
  PROCESSED: "processed",
  DUMPED: "dumped",
  ERROR: "error",
};

export const UPLOAD_MESSAGE = {
  UPLOADED: "Build upload started.",
  PROCESSING: "Build is being processed.",
  PROCESSED: "Build processed successfully.",
  DUMPED: "Build dumped successfully.",
  ERROR: "An error occurred while processing the build.",
};

export const UPLOAD_TYPE = {
  BUILD: "build",
};

export type UploadRecordInput = {
  ref: string;
  type: string;
  status: string;
  message: string;
  filePath: string;
  userId: string;
};

export const isBuildRef = (ref: string) => ref.startsWith("project");

export async function addOrUpdateUploadRecord(input: UploadRecordInput) {
  const existingUploadResult = await fetchAsAdmin(GET_UPLOAD_BY_REF_QUERY, {
    ref: input.ref,
    userId: input.userId,
  });

  if (existingUploadResult?.errors) {
    throw new Error("Failed to get upload record");
  }

  const existingUpload = existingUploadResult?.data?.uploads?.[0];
  const uploadSet = {
    type: input.type,
    status: input.status,
    message: input.message,
    file_path: input.filePath,
  };
  const uploadObject = {
    ref: input.ref,
    ...uploadSet,
    user_id: input.userId,
  };

  const result = existingUpload
    ? await fetchAsAdmin(UPDATE_UPLOAD_MUTATION, {
        id: existingUpload.id,
        set: uploadSet,
      })
    : await fetchAsAdmin(CREATE_UPLOAD_MUTATION, {
        object: uploadObject,
      });

  if (result?.errors) {
    throw new Error("Failed to save upload record");
  }

  return result?.data?.upload;
}
