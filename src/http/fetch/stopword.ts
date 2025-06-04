import type { Configuration } from "@/config";
import type { Stopword, StopwordCreate, StopwordOperations } from "@/stopword";

import { getConfiguration } from "@/config";
import { makeRequest } from "@/http/fetch/request";

async function retrieveAllStopwords(
  config?: Configuration,
): Promise<{ stopwords: Stopword<string>[] }> {
  return makeRequest({
    endpoint: "/stopwords",
    config: getConfiguration(config),
    method: "GET",
  });
}
function stopword<const Id extends string>(
  id: Id,
  stopword: StopwordCreate,
): StopwordOperations<Id> {
  return {
    stopword: {
      ...stopword,
      id: id,
    },

    upsert(config?: Configuration) {
      return makeRequest({
        body: stopword,
        endpoint: `/stopwords/${encodeURIComponent(id)}`,
        config: getConfiguration(config),
        method: "PUT",
      });
    },

    delete(config?: Configuration) {
      return makeRequest({
        endpoint: `/stopwords/${encodeURIComponent(id)}`,
        config: getConfiguration(config),
        method: "DELETE",
      });
    },

    retrieve(config?: Configuration) {
      return makeRequest({
        endpoint: `/stopwords/${encodeURIComponent(id)}`,
        config: getConfiguration(config),
        method: "GET",
      });
    },
  };
}

export { stopword, retrieveAllStopwords };
