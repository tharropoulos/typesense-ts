export { multisearch } from "./http/fetch/multisearch";
export { multisearchEntry } from "./multisearch";
export { collection, retrieveAllCollections } from "./http/fetch/collection";
export { alias, retrieveAllAliases } from "./http/fetch/alias";
export { validateCollectionUpdate } from "./collection";
export { override, retrieveAllOverrides } from "./http/fetch/override";
export { stopword, retrieveAllStopwords } from "./http/fetch/stopword";
export {
  analyticsRule,
  sendEvent,
  retrieveAllAnalyticsRules,
} from "./http/fetch/analytics";
export {
  configure,
  setDefaultConfiguration,
  getDefaultConfiguration,
  clearDefaultConfiguration,
} from "./config";

export type * from "./config";
export type { Collections, InferNativeType } from "./collection";
export type { Aliases } from "./alias";
export type { Overrides } from "./override";
export type { Stopwords } from "./stopword";
export type { AnalyticsRules } from "./analytics/rules";
export type { SearchResponse } from "./search";
