import type { Configuration } from "@/config";
import type { HttpMethod } from "@/lib/url";

import { getErrorMessage, RequestError } from "@/error";
import { constructUrl } from "@/lib/url";
import { sleep } from "@/lib/utils";
import { getNextNode } from "@/node";


export type MakeRequestInit = Omit<RequestInit, 'method' | 'body' | 'headers'>

async function makeRequest<TBody, TReturn>(input: {
  config: Configuration;
  method: HttpMethod;
  body?: TBody;
  params?: URLSearchParams;
  isImport?: boolean;
  endpoint?: `/${string}`;
  currentNodeIndex?: number;
  attempt?: number;
}): Promise<TReturn> {
  const {
    method,
    config,
    body,
    params,
    endpoint,
    isImport = false,
    currentNodeIndex = 0,
    attempt: attemptNum = 1,
  } = input

  const node = getNextNode({
    nodes: config.nodes,
    nearestNode: config.nearestNode,
    currentIndex: currentNodeIndex,
    healthcheckIntervalSeconds: config.healthcheckIntervalSeconds,
  });

  const url = constructUrl({ baseUrl: node.node.url, params, endpoint });

  const fetchFn = config.fetch?.fn ?? fetch
  try {
    const response = await fetchFn(url, {
      ...config.fetch?.init,
      method,
      headers: {
        "Content-Type": isImport ? "text/plain" : "application/json",
        "X-TYPESENSE-API-KEY": config.apiKey,
        ...config.additionalHeaders,
      },
      body: isImport ? (body as string) : JSON.stringify(body),
    });
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
      ...input,
      attempt: attemptNum + 1,
      currentNodeIndex: node.nextIndex,
    });
  } catch (error) {
    if (error instanceof RequestError) {
      throw error;
    }
    throw new Error(getErrorMessage(error));
  }
}

export { makeRequest };
