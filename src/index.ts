export { multisearch } from "./http/fetch/multisearch";
export { multisearchEntry } from "./multisearch";
export { collection, retrieveAllCollections } from "./http/fetch/collection";
export { alias, retrieveAllAliases } from "./http/fetch/alias";
export { validateCollectionUpdate } from "./collection";
export { override, retrieveAllOverrides } from "./http/fetch/override";
export {
  configure,
  setDefaultConfiguration,
  getDefaultConfiguration,
  clearDefaultConfiguration,
} from "./config";

export type * from "./config";
export type { Collections } from "./collection";
export type { Aliases } from "./alias";
export type { Overrides } from "./override";
