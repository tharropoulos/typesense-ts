import type {
  Collection,
  CreateOptions as CollectionCreateOptions,
  DeleteOptions as CollectionDeleteOptions,
  CollectionField,
  ExtractFields,
  FacetableFieldKeys,
  GetSchemaFromName,
  GlobalCollections,
} from "@/collection/base";
import type { Configuration } from "@/config";
import type { OmitDefaultSortingField } from "@/lib/utils";
import type {
  ExcludeFields,
  IncludeFields,
  LengthOf,
  QueryBy,
  SearchParams,
  SearchResponse,
  SubsetTuple,
} from "@/search";

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

async function deleteCollection<
  Name extends GlobalCollections[keyof GlobalCollections]["name"],
>(
  name: Name,
  config: Configuration,
  options?: CollectionDeleteOptions,
): Promise<
  Collection & {
    created_at: number;
    num_documents: number;
    num_memory_shards: number;
  }
> {
  if (!options) {
    return await makeRequest({
      endpoint: `/collections/${encodeURIComponent(name)}`,
      config,
      method: "DELETE",
    });
  }

  const params = new URLSearchParams(options);

  return await makeRequest({
    endpoint: `/collections/${encodeURIComponent(name)}`,
    config,
    method: "DELETE",
    params,
  });
}

async function search<
  const Name extends GlobalCollections[keyof GlobalCollections]["name"],
  const Schema extends OmitDefaultSortingField<GetSchemaFromName<Name>>,
  const FilterBy extends string,
  const SortBy extends string,
  const QueryByTuple extends QueryBy<Fields>,
  const Q extends "*" | (string & {}),
  const HighlightFieldsTuple extends
    | "none"
    | SubsetTuple<QueryByTuple>
    | undefined = undefined,
  const IncludeFieldsTuple extends
    | IncludeFields<Fields>
    | undefined = undefined,
  const ExcludeFieldsTuple extends
    | ExcludeFields<Fields>
    | undefined = undefined,
  const FacetByTuple extends
    | FacetableFieldKeys<Fields>[]
    | undefined = undefined,
  const GroupByTuple extends
    | FacetableFieldKeys<Fields>[]
    | undefined = undefined,
  const QueryByLength extends number = LengthOf<QueryByTuple>,
  const Fields extends CollectionField[] = ExtractFields<Schema>,
  const EnableV1Highlights extends boolean = true,
>(
  name: Name,
  searchParams: SearchParams<
    Schema,
    FilterBy,
    SortBy,
    Q,
    QueryByTuple,
    HighlightFieldsTuple,
    IncludeFieldsTuple,
    ExcludeFieldsTuple,
    FacetByTuple,
    GroupByTuple,
    QueryByLength,
    Fields,
    EnableV1Highlights
  >,
  config: Configuration,
): Promise<
  SearchResponse<
    Fields,
    QueryByTuple,
    HighlightFieldsTuple,
    IncludeFieldsTuple,
    ExcludeFieldsTuple,
    FacetByTuple,
    GroupByTuple,
    Q,
    EnableV1Highlights
  >
> {
  for (const param in searchParams) {
    if (Array.isArray(param)) {
      param.join(",");
    }
  }

  const urlParams = new URLSearchParams(
    searchParams as unknown as Record<string, string>,
  );

  return await makeRequest({
    endpoint: `/collections/${encodeURIComponent(name)}/documents/search`,
    config,
    method: "GET",
    params: urlParams,
  });
}

export {
  createCollection,
  updateCollection,
  retrieveCollection,
  deleteCollection,
  retrieveAllCollections,
  search,
};
