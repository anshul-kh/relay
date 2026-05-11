import type { Request, Response } from "express";
import { stripProjectSlug } from "../../helpers/project";
import { fetchWithCache } from "../../lib/graphql";
import { GET_PROJECT_QUERY } from "../../graphql/queries/project";
import { resolveFilePath } from "../../helpers/path";
import { streamFile } from "../../helpers/stream";

export async function handleBuildServe(req: Request, res: Response) {
  try {
    const slug = stripProjectSlug(req.hostname);
    if (!slug) {
      return res.status(404).send("Not found");
    }

    const siteData = await fetchWithCache(GET_PROJECT_QUERY, { slug }, {}, { key: slug, forceFetch: false });
    if (!siteData?.data?.site?.[0]?.is_active) {
      return res.status(404).send("Not found");
    }

    const pathname = req.path;
    const isSPA = siteData.data.site[0].metadata?.isSPA || false;
    const { error, isFound, shouldServe, filePath, status } = await resolveFilePath(pathname, slug, isSPA);

    if (error) {
      return res
        .status(status || 400)
        .send(error)
        .end();
    }

    if (shouldServe && isFound && filePath) {
      return streamFile(filePath, res);
    }

    return res.status(404).send("Not found").end();
  } catch (error) {
    res.status(400).send("Invalid hostname/Not found").end();
  }
}
