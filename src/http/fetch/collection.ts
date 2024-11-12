import type {
  Collection,
  CreateOptions as CollectionCreateOptions,
  CollectionField,
  GlobalCollections,
} from "@/collection/base";
import type { Configuration } from "@/config";
import type { OmitDefaultSortingField } from "@/lib/utils";

import { makeRequest } from "@/http/fetch/request";

async function createCollection<
  const T extends OmitDefaultSortingField<Collection>,
>(
  collection: T,
  config: Configuration,
  options?: CollectionCreateOptions,
): Promise<
  T extends OmitDefaultSortingField<Collection> ?
    T & {
      created_at: number;
      num_documents: number;
      num_memory_shards: number;
    }
  : OmitDefaultSortingField<Collection> & {
      created_at: number;
      num_documents: number;
      num_memory_shards: number;
    }
> {
  const params = new URLSearchParams(options);

  return await makeRequest({
    body: collection,
    endpoint: "/collections",
    config,
    method: "POST",
    params,
  });
}

async function updateCollection<
  const T extends { fields: CollectionField[]; name: string },
>(
  collection: T,
  config: Configuration,
): Promise<{ fields: CollectionField<string, string>[] }> {
  return await makeRequest({
    body: { fields: collection.fields },
    endpoint: `/collections/${encodeURIComponent(collection.name)}`,
    config,
    method: "PATCH",
  });
}

async function retrieveAllCollections(config: Configuration): Promise<
  (OmitDefaultSortingField<Collection> & {
    created_at: number;
    num_documents: number;
    num_memory_shards: number;
  })[]
> {
  return await makeRequest({
    endpoint: "/collections",
    config,
    method: "GET",
  });
}

async function retrieveCollection<
  Name extends GlobalCollections[keyof GlobalCollections]["name"],
>(
  name: Name,
  config: Configuration,
): Promise<
  OmitDefaultSortingField<Collection> & {
    created_at: number;
    num_documents: number;
    num_memory_shards: number;
  }
> {
  return await makeRequest({
    endpoint: `/collections/${encodeURIComponent(name)}`,
    config,
    method: "GET",
  });
}

export {
  createCollection,
  updateCollection,
  retrieveCollection,
  retrieveAllCollections,
};
