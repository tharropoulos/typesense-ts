import type { Collections } from "@/collection/base";
import type { Configuration } from "@/config";

/**
 * Alias for a collection name
 * @template Name - Alias name
 * @template CollectionName - Collection name
 */
interface Alias<
  Name extends string,
  CollectionName extends Collections[keyof Collections]["name"],
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
type GetCollectionName<N extends Aliases[keyof Aliases]["name"]> = {
  [K in keyof Aliases]: Aliases[K]["name"] extends N ?
    Aliases[K]["collection_name"]
  : never;
}[keyof Aliases];

/**
 * Helper function to define an alias
 * @param alias - Alias object
 * @returns  Alias object
 */
function alias<
  const Name extends string,
  const CollectionName extends Collections[keyof Collections]["name"],
>(alias: Alias<Name, CollectionName>) {
  return alias;
}

export interface AliasOperations<
  Name extends string,
  CollectionName extends Collections[keyof Collections]["name"],
> {
  readonly alias: Alias<Name, CollectionName>;
  retrieve(config?: Configuration): Promise<Alias<Name, CollectionName>>;
  delete(config?: Configuration): Promise<Alias<Name, CollectionName>>;
  upsert(config?: Configuration): Promise<Alias<Name, CollectionName>>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Aliases {}

export type { Alias, Aliases, GetCollectionName, BaseAlias };

export { alias };
