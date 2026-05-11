export type ResolvedFilePath = {
  error: string | null;
  shouldServe: boolean;
  isFound: boolean;
  filePath: string | null;
  status: number;
};
