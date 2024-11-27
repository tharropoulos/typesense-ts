import type {
  CollectionField,
  GetSchemaFromName,
  GlobalCollections,
} from "@/collection/base";
import type { OmitDefaultSortingField } from "@/lib/utils";
import type {
  ExcludeFields,
  ExtractFields,
  FacetableFieldKeys,
  IncludeFields,
  LengthOf,
  QueryBy,
  SearchParams,
  SearchResponse,
  SubsetTuple,
} from "@/search";

/**
 * Configuration parameters for a single entry in a multi-search request
 * @template Name - The name of the collection from GlobalCollections
 * @template Schema - The collection schema, excluding default sorting fields
 * @template FilterBy - Filter expression string type
 * @template SortBy - Sort expression string type
 * @template QueryByTuple - Tuple of fields to query against
 * @template Q - Query string, either "*" or a specific string
 * @template HighlightFieldsTuple - Fields to highlight in results (optional)
 * @template IncludeFieldsTuple - Fields to include in results (optional)
 * @template ExcludeFieldsTuple - Fields to exclude from results (optional)
 * @template FacetByTuple - Fields to facet by (optional)
 * @template GroupByTuple - Fields to group by (optional)
 * @template QueryByLength - Length of the QueryByTuple (default: computed)
 * @template Fields - Array of collection fields (default: extracted from Schema)
 * @template EnableV1Highlights - Whether to use v1 highlighting (default: true)
 */
type MultiSearchParamsEntry<
  Name extends GlobalCollections[keyof GlobalCollections]["name"],
  Schema extends OmitDefaultSortingField<GetSchemaFromName<Name>>,
  FilterBy extends string,
  SortBy extends string,
  QueryByTuple extends QueryBy<ExtractFields<Schema>>,
  Q extends "*" | (string & {}),
  HighlightFieldsTuple extends
    | "none"
    | SubsetTuple<QueryByTuple>
    | undefined = undefined,
  IncludeFieldsTuple extends
    | IncludeFields<ExtractFields<Schema>>
    | undefined = undefined,
  ExcludeFieldsTuple extends
    | ExcludeFields<ExtractFields<Schema>>
    | undefined = undefined,
  FacetByTuple extends
    | FacetableFieldKeys<ExtractFields<Schema>>[]
    | undefined = undefined,
  GroupByTuple extends
    | FacetableFieldKeys<ExtractFields<Schema>>[]
    | undefined = undefined,
  QueryByLength extends number = LengthOf<QueryByTuple>,
  Fields extends CollectionField[] = ExtractFields<Schema>,
  EnableV1Highlights extends boolean = true,
> = {
  collection: Name;
} & SearchParams<
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
>;

/**
 * A multisearch search response
 * @template Fields The collection fields
 * @template QueryByTuple The query_by fields
 * @template HighlightFields The highlight_fields fields
 * @template IncludeFieldsTuple The include_fields fields
 * @template ExcludeFieldsTuple The exclude_fields fields
 * @template FacetByTuple The facet_by fields
 * @template GroupByTuple The group_by fields
 * @template Q The query string
 * @template EnableV1Highlights Whether to enable v1 highlights
 */
type MultiSearchResponse<
  Fields extends CollectionField[],
  QueryByTuple extends QueryBy<Fields>,
  HighlightFields extends "none" | SubsetTuple<QueryByTuple> | undefined,
  IncludeFieldsTuple extends IncludeFields<Fields> | undefined,
  ExcludeFieldsTuple extends ExcludeFields<Fields> | undefined,
  FacetByTuple extends FacetableFieldKeys<Fields>[] | undefined,
  GroupByTuple extends FacetableFieldKeys<Fields>[] | undefined,
  Q extends string,
  EnableV1Highlights extends boolean,
> = SearchResponse<
  Fields,
  QueryByTuple,
  HighlightFields,
  IncludeFieldsTuple,
  ExcludeFieldsTuple,
  FacetByTuple,
  GroupByTuple,
  Q,
  EnableV1Highlights
> & { error?: string; code?: number };

type MultiSearchResultEntry<T> =
  T extends (
    MultiSearchParamsEntry<
      infer _Name,
      infer _Schema,
      infer _FilterBy,
      infer _SortBy,
      infer QueryByTuple,
      infer Q,
      infer HighlightFieldsTuple,
      infer IncludeFieldsTuple,
      infer ExcludeFieldsTuple,
      infer FacetByTuple,
      infer GroupByTuple,
      infer _QueryByLength,
      infer Fields,
      infer EnableV1Highlights
    >
  ) ?
    MultiSearchResponse<
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
  : never;

/**
 * Creates a typed entry for multi-search operations
 * @template Name - Collection name from GlobalCollections
 * @template Schema - Collection schema without default sorting fields
 * @template FilterBy - Filter expression
 * @template SortBy - Sort expression
 * @template QueryByTuple - Fields to query against
 * @template Q - Query string
 * @template HighlightFieldsTuple - Fields to highlight
 * @template IncludeFieldsTuple - Fields to include
 * @template ExcludeFieldsTuple - Fields to exclude
 * @template FacetByTuple - Fields to facet by
 * @template GroupByTuple - Fields to group by
 * @template QueryByLength - Length of query fields tuple
 * @template Fields - Collection fields
 * @template EnableV1Highlights - Enable v1 highlighting
 *
 * @example
 * // Create a search entry for products collection
 * const searchEntry = multisearchEntry({
 *   collection: "products",
 *   q: "wireless headphones",
 *   query_by: ["name", "description"],
 *   filter_by: "in_stock:true && price:<100",
 *   sort_by: "price:desc",
 *   highlight_fields: ["name"],
 *   include_fields: ["name", "price", "brand"],
 *   exclude_fields: ["description"],
 *   facet_by: ["category"],
 *   group_by: ["brand"],
 *   per_page: 20
 * });
 *
 * // Type-safe entry with all parameters properly typed
 * type Entry = typeof searchEntry;
 *
 * @returns A type-safe multi-search entry
 */
function multisearchEntry<
  const Name extends GlobalCollections[keyof GlobalCollections]["name"],
  const Schema extends OmitDefaultSortingField<GetSchemaFromName<Name>>,
  const FilterBy extends string,
  const SortBy extends string,
  const QueryByTuple extends QueryBy<ExtractFields<Schema>>,
  const Q extends "*" | (string & {}),
  const HighlightFieldsTuple extends
    | "none"
    | SubsetTuple<QueryByTuple>
    | undefined = undefined,
  const IncludeFieldsTuple extends
    | IncludeFields<ExtractFields<Schema>>
    | undefined = undefined,
  const ExcludeFieldsTuple extends
    | ExcludeFields<ExtractFields<Schema>>
    | undefined = undefined,
  const FacetByTuple extends
    | FacetableFieldKeys<ExtractFields<Schema>>[]
    | undefined = undefined,
  const GroupByTuple extends
    | FacetableFieldKeys<ExtractFields<Schema>>[]
    | undefined = undefined,
  const QueryByLength extends number = LengthOf<QueryByTuple>,
  const Fields extends CollectionField[] = ExtractFields<Schema>,
  const EnableV1Highlights extends boolean = true,
>(
  entry: {
    collection: Name;
  } & SearchParams<
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
): MultiSearchParamsEntry<
  Name,
  Schema,
  FilterBy,
  SortBy,
  QueryByTuple,
  Q,
  HighlightFieldsTuple,
  IncludeFieldsTuple,
  ExcludeFieldsTuple,
  FacetByTuple,
  GroupByTuple,
  QueryByLength,
  Fields,
  EnableV1Highlights
> {
  return entry;
}

export type {
  MultiSearchResponse,
  MultiSearchParamsEntry,
  MultiSearchResultEntry,
};

export { multisearchEntry };
