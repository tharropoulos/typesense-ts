import type { Configuration } from "@/config";
import type { HttpMethod } from "@/lib/url";

import { getErrorMessage, RequestError } from "@/error";
import { constructUrl } from "@/lib/url";
import { sleep } from "@/lib/utils";
import { getNextNode } from "@/node";

async function makeRequest<TBody, TReturn>({
  method,
  config,
  body,
  params,
  endpoint,
  isImport = false,
  currentNodeIndex = 0,
  attempt: attemptNum = 1,
}: {
  config: Configuration;
  method: HttpMethod;
  // `() => BodyInit` is a factory invoked per-attempt -- lets callers pass
  // a `ReadableStream` (consumed on first try) while still preserving retry
  // semantics on 5xx; see the streaming-JSONL body in `documents.import`.
  body?: TBody | (() => BodyInit);
  params?: URLSearchParams;
  isImport?: boolean;
  endpoint?: `/${string}`;
  currentNodeIndex?: number;
  attempt?: number;
}): Promise<TReturn> {
  const node = getNextNode({
    nodes: config.nodes,
    nearestNode: config.nearestNode,
    currentIndex: currentNodeIndex,
    healthcheckIntervalSeconds: config.healthcheckIntervalSeconds,
  });

  const url = constructUrl({ baseUrl: node.node.url, params, endpoint });

  try {
    const fetchBody =
      isImport ?
        typeof body === "function" ?
          (body as () => BodyInit)()
        : (body as BodyInit)
      : JSON.stringify(body);
    // Node 22+ (undici) requires `duplex: "half"` when sending a stream
    // body. Cast because the type isn't in lib.dom yet; Workers/Deno/Bun
    // either require or tolerate the same option.
    const fetchInit: RequestInit & { duplex?: "half" } = {
      method,
      headers: {
        "Content-Type": isImport ? "text/plain" : "application/json",
        "X-TYPESENSE-API-KEY": config.apiKey,
        ...config.additionalHeaders,
      },
      body: fetchBody,
    };
    if (fetchBody instanceof ReadableStream) {
      fetchInit.duplex = "half";
    }
    const response = await fetch(url, fetchInit);
    const responseText = await response.text();

    if (response.ok) {
      if (isImport) {
        return responseText
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => JSON.parse(line) as unknown) as TReturn;
      }
      return JSON.parse(responseText) as TReturn;
    }

    if (response.status < 500) {
      throw new RequestError(response.status, responseText, attemptNum);
    }

    if (attemptNum > config.numRetries) {
      throw new RequestError(response.status, responseText, attemptNum);
    }

    await sleep(config.retryIntervalSeconds * 1000);

    return makeRequest({
      method,
      config,
      // Pass body unchanged -- if it's a factory, the recursive call will
      // invoke it again to get a fresh stream for the retry.
      body,
      params,
      isImport,
      endpoint,
      currentNodeIndex: node.nextIndex,
      attempt: attemptNum + 1,
    });
  } catch (error) {
    if (error instanceof RequestError) {
      throw error;
    }
    throw new Error(getErrorMessage(error));
  }
}

export { makeRequest };
