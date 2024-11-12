import type { GlobalCollections } from "@/collection/base";

/**
 * Alias for a collection name
 * @template Name - Alias name
 * @template CollectionName - Collection name
 */
interface Alias<
  Name extends string,
  CollectionName extends GlobalCollections[keyof GlobalCollections]["name"],
> {
  collection_name: CollectionName;
  name: Name;
}

interface BaseAlias {
  collection_name: string;
  name: string;
}
/**
 * Get collection name by alias name
 * @template N - Alias name
 * @returns Collection name
 */
type GetCollectionName<N extends GlobalAliases[keyof GlobalAliases]["name"]> = {
  [K in keyof GlobalAliases]: GlobalAliases[K]["name"] extends N ?
    GlobalAliases[K]["collection_name"]
  : never;
}[keyof GlobalAliases];

/**
 * Helper function to define an alias
 * @param alias - Alias object
 * @returns  Alias object
 */
function alias<
  const Name extends string,
  const CollectionName extends
    GlobalCollections[keyof GlobalCollections]["name"],
>(alias: Alias<Name, CollectionName>) {
  return alias;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GlobalAliases {}

export type { Alias, GlobalAliases, GetCollectionName, BaseAlias };

export { alias };
