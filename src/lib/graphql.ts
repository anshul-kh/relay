import { getCache, setCache } from "./cache";
import { APP_CONTEXT } from "./context";

const HASURA_GRAPHQL_ENDPOINT = APP_CONTEXT.appConfig.hasura.endpoint;

async function getHasuraAdminSecret() {
  return APP_CONTEXT.appConfig.hasura.adminSecret;
}

async function fetchFn(url: string, query: string, variables: any, headers: any, signal: AbortSignal) {
  try {
    const result = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        query,
        variables,
      }),
      headers,
      signal,
    });
    const response = await result.json();
    return response;
  } catch (e) {
    throw e;
  }
}

function fetchGraphQL(url: string, query: string, variables: any, headers: any, signal: AbortSignal) {
  return fetchFn(url, query, variables, headers, signal);
}

export async function fetchAsAdmin(
  query: string,
  variables: any,
  headers: any = {},
  signal: AbortSignal = new AbortController().signal,
): Promise<any> {
  const hasuraAdminSecret = await getHasuraAdminSecret();

  return fetchGraphQL(
    HASURA_GRAPHQL_ENDPOINT,
    query,
    variables,
    {
      ...headers,
      "x-hasura-admin-secret": hasuraAdminSecret,
    },
    signal,
  );
}

export async function fetchAsAnonymous(
  query: string,
  variables: any,
  headers: any = {},
  signal: AbortSignal = new AbortController().signal,
): Promise<any> {
  return fetchGraphQL(
    HASURA_GRAPHQL_ENDPOINT,
    query,
    variables,
    {
      ...headers,
    },
    signal,
  );
}

export async function fetchWithCache(
  query: string,
  variables: any,
  headers: any,
  { key, forceFetch }: { key: string; forceFetch: boolean },
) {
  if (!forceFetch) {
    const cached = getCache(key);
    if (cached) {
      return cached;
    }
  }

  const result = await fetchAsAdmin(query, variables, headers, new AbortController().signal);
  setCache(key, result);
  return result;
}

export async function fetchWithCacheAsAnonymous(
  query: string,
  variables: any,
  headers: any,
  { key, forceFetch }: { key: string; forceFetch: boolean },
) {
  if (!forceFetch) {
    const cached = getCache(key);
    if (cached) {
      return cached;
    }
  }

  const result = await fetchAsAnonymous(query, variables, headers, new AbortController().signal);
  setCache(key, result);
  return result;
}
