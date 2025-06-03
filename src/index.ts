export { multisearch } from "./http/fetch/multisearch";
export { multisearchEntry } from "./multisearch";
export { collection, retrieveAllCollections } from "./http/fetch/collection";
export { alias, retrieveAllAliases } from "./http/fetch/alias";
export { validateCollectionUpdate } from "./collection";
export { configure } from "./config";

export type * from "./config";
export type { GlobalCollections } from "./collection";
export type { GlobalAliases } from "./alias";
