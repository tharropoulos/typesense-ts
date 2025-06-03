import type {
  ChildFields,
  Collection,
  CollectionCreate,
  CreateOptions as CollectionCreateOptions,
  DeleteOptions as CollectionDeleteOptions,
  CollectionField,
  DefaultSortingFields,
  ExtractFields,
  FacetableFieldKeys,
} from "@/collection/base";
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

/**
 * Interface for a collection object that provides methods for collection operations.
 * @template Schema The collection schema type
 */
export interface CollectionOperations<
  Schema extends CollectionCreate<
    [{ name: "id"; type: "string" }, ...Fields],
    Name,
    DefaultSort
  >,
  Fields extends CollectionField<string, string>[],
  Name extends string,
  DefaultSort extends DefaultSortingFields<Fields> | undefined = undefined,
> {
  /**
   * The collection schema
   */
  readonly schema: Schema;

  /**
   * Create the collection in Typesense
   */
  create(options?: CollectionCreateOptions): Promise<
    Schema extends OmitDefaultSortingField<Schema> ?
      Schema & {
        created_at: number;
        num_documents: number;
        num_memory_shards: number;
      }
    : OmitDefaultSortingField<Schema> & {
        created_at: number;
        num_documents: number;
        num_memory_shards: number;
      }
  >;

  /**
   * Update the collection schema
   */
  update<const T extends { fields: CollectionField[]; name: string }>(
    collection: T,
  ): Promise<{ fields: CollectionField<string, string>[] }>;

  /**
   * Retrieve the collection information
   */
  retrieve(): Promise<
    OmitDefaultSortingField<Collection> & {
      created_at: number;
      num_documents: number;
      num_memory_shards: number;
    }
  >;

  /**
   * Delete the collection
   */
  delete(options?: CollectionDeleteOptions): Promise<
    Collection & {
      created_at: number;
      num_documents: number;
      num_memory_shards: number;
    }
  >;

  /**
   * Search documents in the collection
   */
  search<
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
      FacetReturnParents,
      GroupByTuple,
      QueryByLength,
      Fields,
      EnableV1Highlights
    >,
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
  >;
}
