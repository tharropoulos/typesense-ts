import type { Configuration } from "@/config";
import type { MultiSearchResultEntry } from "@/multisearch";

import { getConfiguration } from "@/config";
import { makeRequest } from "@/http/fetch/request";
import { ARRAY_KEYS } from "@/search";

interface MultiSearchQueryParams {
  limit_multi_searches?: number;
  "x-typesense-api-key"?: string;
}

/**
 * Executes multiple search operations in parallel
 * @template Searches - Array type containing search parameter entries using `multisearchEntry`
 * @param searchParams - Object containing array of search configurations
 * @param config - API configuration object
 * @param queryParams - Optional query parameters for the multi-search request
 *
 * @returns Promise resolving to an object with results mapped to each search entry
 *
 * @example
 * const res = await multisearch({
 *   searches: [
 *     multisearchEntry({
 *       collection: "products",
 *       q: "phone",
 *       query_by: ["name", "description"],
 *       filter_by: "in_stock:true"
 *     }),
 *     multisearchEntry({
 *       collection: "articles",
 *       q: "technology",
 *       query_by: ["title", "content"]
 *     })
 *   ]
 * }, config, { limit_multi_searches: 5 });
 *
 * //  ^? res: {
 * //      results: [
 * //                  0: MultiSearchResponse<...>,
 * //                  1: MultiSearchResponse<...>
 * //               ]
 * //         }
 */
async function multisearch<const Searches extends readonly object[]>(
  searchParams: {
    searches: [...Searches];
  },
  config?: Configuration,
  queryParams?: MultiSearchQueryParams,
): Promise<{
  results: { [K in keyof Searches]: MultiSearchResultEntry<Searches[K]> };
}> {
  {
    for (const search of searchParams.searches) {
      for (const [key, value] of Object.entries(search)) {
        if (Array.isArray(value) && Object.keys(ARRAY_KEYS).includes(key)) {
          (search as unknown as Record<string, unknown>)[key] = value.join(",");
        }
      }
    }

    if (queryParams) {
      const urlParams = new URLSearchParams(normalizeQueryParams(queryParams));

      return await makeRequest({
        endpoint: `/multisearch?${urlParams.toString()}`,
        config: getConfiguration(config),
        method: "POST",
        body: searchParams,
        params: urlParams,
      });
    }

    return await makeRequest({
      endpoint: "/multi_search",
      config: getConfiguration(config),
      method: "POST",
      body: searchParams,
    });
  }
}

function normalizeQueryParams(params: MultiSearchQueryParams): Omit<
  MultiSearchQueryParams,
  "limit_multi_searches"
> & {
  limit_multi_searches?: string;
} {
  const { limit_multi_searches, ..._rest } = params;
  if (limit_multi_searches) {
    return {
      ..._rest,
      limit_multi_searches: String(limit_multi_searches),
    };
  }

  return _rest;
}

export { multisearch };
