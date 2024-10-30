import type {
  Collection,
  CreateOptions as CollectionCreateOptions,
} from "@/collection/base";
import type { OmitDefaultSortingField } from "@/lib/utils";

interface EntityMap {
  collection: {
    body: OmitDefaultSortingField<Collection>;
    type: "collection";
    urlParams: CollectionCreateOptions;
    return: Collection & {
      created_at: number;
      num_documents: number;
      num_memory_shards: number;
    };
  };
}

type EntityToTypeMap = {
  [K in keyof EntityMap]: EntityMap[K]["body"];
};

type EntityToOptionsMap = {
  [K in keyof EntityMap]: EntityMap[K]["urlParams"];
};

type EntityToReturnMap = {
  [K in keyof EntityMap]: EntityMap[K]["return"];
};

type GetEntity<T> = {
  [K in keyof EntityMap]: T extends EntityMap[K]["body"] ? K : never;
}[keyof EntityMap];

type EntityTypes = EntityMap[keyof EntityMap]["type"];

function getEntityType<T extends EntityToTypeMap[keyof EntityToTypeMap]>(
  entity: T,
): EntityTypes {
  if ("name" in entity && "fields" in entity) {
    return "collection";
  }

  throw new Error("Invalid entity type");
}

export type {
  EntityToTypeMap,
  EntityToOptionsMap,
  EntityToReturnMap,
  GetEntity,
  EntityTypes,
};

export { getEntityType };
