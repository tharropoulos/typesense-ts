import type { CollectionOperations } from "@/collection";
import type {
  ChildFields,
  Collection,
  CollectionCreate,
  CreateOptions as CollectionCreateOptions,
  DeleteOptions as CollectionDeleteOptions,
  CollectionField,
  DefaultSortingFields,
  EmbeddingField,
  ExtractFields,
  FacetableFieldKeys,
  GetSchemaFromName,
  GlobalCollections,
  InferNativeType,
} from "@/collection/base";
import type { Configuration } from "@/config";
import type {
  DocumentImportParameters,
  DocumentImportResponseSuccess,
  ImportResponseFail,
  UpdateParameters,
} from "@/document";
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

import { getConfiguration } from "@/config";
import { makeRequest } from "@/http/fetch/request";
import { ARRAY_KEYS } from "@/search";

class DocumentImportError extends Error {
  public readonly failedDocuments: ImportResponseFail[];

  constructor(failedDocuments: ImportResponseFail[]) {
    super(`Failed to import ${failedDocuments.length} documents`);
    this.name = "DocumentImportError";
    this.failedDocuments = failedDocuments;
  }
}

async function retrieveAllCollections(config?: Configuration): Promise<
  (OmitDefaultSortingField<Collection> & {
    created_at: number;
    num_documents: number;
    num_memory_shards: number;
  })[]
> {
  return await makeRequest({
    endpoint: "/collections",
    config: getConfiguration(config),
    method: "GET",
  });
}

function collection<
  const Fields extends CollectionField<string, string>[],
  const Name extends string,
  const DefaultSort extends
    | DefaultSortingFields<Fields>
    | undefined = undefined,
>(
  schema: Omit<
    CollectionCreate<
      [{ name: "id"; type: "string" }, ...Fields],
      Name,
      DefaultSort
    >,
    "fields" | "default_sorting_field"
  > & {
    name: Name;
    default_sorting_field?: DefaultSort;
    fields: {
      [K in keyof Fields]: Fields[K] extends EmbeddingField ?
        EmbeddingField<
          Fields[K]["name"],
          Extract<Fields[number], { type: "string" }>["name"]
        >
      : Fields[K];
    };
  },
): CollectionOperations<
  CollectionCreate<
    [{ name: "id"; type: "string" }, ...Fields],
    Name,
    DefaultSort
  >,
  Fields,
  Name,
  DefaultSort
> {
  const collectionSchema = {
    ...schema,
    fields: [{ name: "id", type: "string" }, ...schema.fields],
  } as Collection<
    [{ name: "id"; type: "string" }, ...Fields],
    Name,
    DefaultSort
  >;

  return {
    documents: {
      async update<
        const FilterBy extends string,
        const DocId extends string | undefined = undefined,
      >(
        document: Partial<
          InferNativeType<typeof collectionSchema.fields & CollectionField[]>
        >,
        params:
          | {
              documentId: DocId;
              parameters?: never;
            }
          | {
              documentId?: never;
              parameters: UpdateParameters<typeof collectionSchema, FilterBy>;
            },
        config?: Configuration,
      ) {
        const urlParams = new URLSearchParams(
          params.parameters as unknown as Record<string, string>,
        );

        if (params.documentId) {
          return await makeRequest({
            endpoint: `/collections/${encodeURIComponent(schema.name)}/documents/${encodeURIComponent(params.documentId)}`,
            config: getConfiguration(config),
            method: "PATCH",
            body: document,
          });
        }

        return await makeRequest({
          endpoint: `/collections/${encodeURIComponent(schema.name)}/documents`,
          config: getConfiguration(config),
          method: "PATCH",
          body: document,
          params: urlParams,
        });
      },

      async create<
        const Doc extends boolean = false,
        const Id extends boolean = false,
      >(
        document: Omit<
          InferNativeType<typeof collectionSchema.fields & CollectionField[]>,
          "id"
        > & {
          id?: string;
        },
        parameters?: DocumentImportParameters<Doc, Id>,
        config?: Configuration,
      ) {
        return await makeRequest({
          endpoint: `/collections/${encodeURIComponent(schema.name)}/documents`,
          config: getConfiguration(config),
          method: "POST",
          body: document,
          params: new URLSearchParams(
            parameters as unknown as Record<string, string>,
          ),
        });
      },

      async import<
        const Doc extends boolean = false,
        const Id extends boolean = false,
        const Fail extends boolean = true,
      >(
        documents: (Omit<
          InferNativeType<typeof collectionSchema.fields & CollectionField[]>,
          "id"
        > & {
          id?: string;
        })[],
        parameters?: DocumentImportParameters<Doc, Id>,
        options?: {
          throw_on_failure?: Fail;
        },
        config?: Configuration,
      ): Promise<
        Fail extends true ?
          DocumentImportResponseSuccess<typeof collectionSchema, Doc, Id>[]
        : (
            | ImportResponseFail
            | DocumentImportResponseSuccess<typeof collectionSchema, Doc, Id>
          )[]
      > {
        const params = new URLSearchParams(
          parameters as unknown as Record<string, string>,
        );

        if (documents.length === 0) {
          throw new Error("Cannot import empty array");
        }

        const docsInJsonl = documents
          .map((document) => JSON.stringify(document))
          .join("\n");

        const result = await makeRequest({
          endpoint: `/collections/${encodeURIComponent(schema.name)}/documents/import`,
          config: getConfiguration(config),
          method: "POST",
          params,
          body: docsInJsonl,
          isImport: true,
        });

        if (options?.throw_on_failure) {
          const failedResults = (result as ImportResponseFail[]).filter(
            (r) => r.success === false,
          );
          if (failedResults.length > 0) {
            const error = new DocumentImportError(failedResults);
            throw error;
          }
          return result as DocumentImportResponseSuccess<
            typeof collectionSchema,
            Doc,
            Id
          >[];
        }

        return result as (
          | DocumentImportResponseSuccess<typeof collectionSchema, Doc, Id>
          | ImportResponseFail
        )[] as Fail extends true ?
          DocumentImportResponseSuccess<typeof collectionSchema, Doc, Id>[]
        : (
            | ImportResponseFail
            | DocumentImportResponseSuccess<typeof collectionSchema, Doc, Id>
          )[];
      },
    },
    schema: collectionSchema,

    async create(options?: CollectionCreateOptions, config?: Configuration) {
      const params = new URLSearchParams(options);

      return await makeRequest({
        body: collectionSchema,
        endpoint: "/collections",
        config: getConfiguration(config),
        method: "POST",
        params,
      });
    },

    async update<const T extends { fields: CollectionField[]; name: string }>(
      collection: T,
      config?: Configuration,
    ) {
      return await makeRequest({
        body: { fields: collection.fields },
        endpoint: `/collections/${encodeURIComponent(collection.name)}`,
        config: getConfiguration(config),
        method: "PATCH",
      });
    },

    async retrieve(config?: Configuration) {
      return await makeRequest({
        endpoint: `/collections/${encodeURIComponent(schema.name)}`,
        config: getConfiguration(config),
        method: "GET",
      });
    },

    async delete(options?: CollectionDeleteOptions, config?: Configuration) {
      if (!options) {
        return await makeRequest({
          endpoint: `/collections/${encodeURIComponent(schema.name)}`,
          config: getConfiguration(config),
          method: "DELETE",
        });
      }

      const params = new URLSearchParams(options);

      return await makeRequest({
        endpoint: `/collections/${encodeURIComponent(schema.name)}`,
        config: getConfiguration(config),
        method: "DELETE",
        params,
      });
    },

    async search<
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
      const FacetReturnParents extends
        | FacetableFieldKeys<ChildFields<Fields>>[]
        | undefined = undefined,
      const GroupByTuple extends
        | FacetableFieldKeys<Fields>[]
        | undefined = undefined,
      const QueryByLength extends number = LengthOf<QueryByTuple>,
      const Fields extends CollectionField[] = ExtractFields<
        typeof collectionSchema
      >,
      const EnableV1Highlights extends boolean = true,
    >(
      searchParams: SearchParams<
        typeof collectionSchema,
        FilterBy,
        SortBy,
        Q,
        Name,
        QueryByTuple,
        HighlightFieldsTuple,
        IncludeFieldsTuple,
        ExcludeFieldsTuple,
        FacetByTuple,
        FacetReturnParents,
        GroupByTuple,
        QueryByLength,
        Fields,
        EnableV1Highlights
      >,
      config?: Configuration,
    ) {
      // Ugly, but needed in order to check for holes in the searchParams object
      for (const [key, value] of Object.entries(searchParams)) {
        if (Array.isArray(value) && Object.keys(ARRAY_KEYS).includes(key)) {
          (searchParams as unknown as Record<string, unknown>)[key] =
            value.join(",");
        }
      }

      const urlParams = new URLSearchParams(
        searchParams as unknown as Record<string, string>,
      );

      return await makeRequest({
        endpoint: `/collections/${encodeURIComponent(schema.name)}/documents/search`,
        config: getConfiguration(config),
        method: "GET",
        params: urlParams,
      });
    },
  };
}

async function _createCollection<
  const T extends OmitDefaultSortingField<Collection>,
>(
  collection: T,
  options?: CollectionCreateOptions,
  config?: Configuration,
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
    config: getConfiguration(config),
    method: "POST",
    params,
  });
}

async function _updateCollection<
  const T extends { fields: CollectionField[]; name: string },
>(
  collection: T,
  config?: Configuration,
): Promise<{ fields: CollectionField<string, string>[] }> {
  return await makeRequest({
    body: { fields: collection.fields },
    endpoint: `/collections/${encodeURIComponent(collection.name)}`,
    config: getConfiguration(config),
    method: "PATCH",
  });
}

async function _search<
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
  const FacetReturnParents extends
    | FacetableFieldKeys<ChildFields<Fields>>[]
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
    Name,
    QueryByTuple,
    HighlightFieldsTuple,
    IncludeFieldsTuple,
    ExcludeFieldsTuple,
    FacetByTuple,
    FacetReturnParents,
    GroupByTuple,
    QueryByLength,
    Fields,
    EnableV1Highlights
  >,
  config?: Configuration,
): Promise<
  SearchResponse<
    Fields,
    QueryByTuple,
    HighlightFieldsTuple,
    IncludeFieldsTuple,
    ExcludeFieldsTuple,
    FacetByTuple,
    FacetReturnParents,
    GroupByTuple,
    Q,
    EnableV1Highlights
  >
> {
  // Ugly, but needed in order to check for holes in the searchParams object
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value) && Object.keys(ARRAY_KEYS).includes(key)) {
      (searchParams as unknown as Record<string, unknown>)[key] =
        value.join(",");
    }
  }

  const urlParams = new URLSearchParams(
    searchParams as unknown as Record<string, string>,
  );

  return await makeRequest({
    endpoint: `/collections/${encodeURIComponent(name)}/documents/search`,
    config: getConfiguration(config),
    method: "GET",
    params: urlParams,
  });
}

async function _retrieveCollection<
  Name extends GlobalCollections[keyof GlobalCollections]["name"],
>(
  name: Name,
  config?: Configuration,
): Promise<
  OmitDefaultSortingField<Collection> & {
    created_at: number;
    num_documents: number;
    num_memory_shards: number;
  }
> {
  return await makeRequest({
    endpoint: `/collections/${encodeURIComponent(name)}`,
    config: getConfiguration(config),
    method: "GET",
  });
}

async function _deleteCollection<
  Name extends GlobalCollections[keyof GlobalCollections]["name"],
>(
  name: Name,
  config?: Configuration,
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
      config: getConfiguration(config),
      method: "DELETE",
    });
  }

  const params = new URLSearchParams(options);

  return await makeRequest({
    endpoint: `/collections/${encodeURIComponent(name)}`,
    config: getConfiguration(config),
    method: "DELETE",
    params,
  });
}

export { collection, retrieveAllCollections };
