import type { UrlString } from "@/node";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

function constructUrl({
  baseUrl,
  params,
  endpoint,
}: {
  baseUrl: UrlString;
  params?: URLSearchParams;
  endpoint?: `/${string}`;
}) {
  const urlWithEndpoint = endpoint ? `${baseUrl}${endpoint}` : baseUrl;
  return params && Array.from(params.entries()).length > 0 ?
      `${urlWithEndpoint}?${params}`
    : urlWithEndpoint;
}

export type { HttpMethod };

export { constructUrl };
