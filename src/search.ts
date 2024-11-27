/* eslint-disable @typescript-eslint/no-empty-object-type */
import type {
  Collection,
  CollectionField,
  CollectionFieldFromTuple,
  DocumentSchema,
  DotLevels,
  ExtractFields,
  FacetableFieldKeys,
  FindBreakingPoint,
  InferNativeType,
  InfixableFieldKeys,
  ObjectFields,
  QueryableFields,
  UnionToIntersection,
} from "@/collection/base";
import type { ParseFilter } from "@/lexer/filter";
import type { ParseSort } from "@/lexer/sort";
import type {
  DeepPartial,
  ExcludeFromTuple,
  IntersectTuples,
  OmitDefaultSortingField,
  TupleIncludes,
} from "@/lib/utils";

type OperationMode = "off" | "always" | "fallback";

type DropTokensMode = "right_to_left" | "left_to_right" | "both_sides:3";

/**
 * Maps the query_by fields into valid infix values
 * @template T The collection fields
 * @template K The query_by fields
 * @example
 * type X = MapInfixValues<[{ name: "a", type: "string" }, { name: "b", type: "string", infix: true }], ["a", "b"]>
 * //   ^? type X = ["off", "always" | "fallback" | "off"]
 */
type MapInfixValues<
  T extends CollectionField[],
  K extends readonly string[],
> = {
  [P in keyof K]: K[P] extends InfixableFieldKeys<T> ? OperationMode : "off";
};

/**
 * Extracts field names that are queryable from a collection's fields
 * @template T Array of collection fields
 * @example
 * // Returns never[] when no string fields exist
 * type NoStrings = QueryBy<[
 *   { type: "int32", name: "foo" },
 *   { type: "bool", name: "bar" }
 * ]>
 * //   ^?: type NoStrings = never[]
 *
 * // Returns tuple of string field names
 * type WithStrings = QueryBy<[
 *   { type: "int32", name: "foo" },
 *   { type: "string", name: "bar" },
 *   { type: "string", name: "baz" }
 * ]>
 * //  ^?: type WithStrings = ("bar" | "baz")[]
 */
type QueryBy<T extends CollectionField[]> = Extract<
  QueryableFields<T>[number],
  { name: string }
>["name"][];

type LengthOf<T extends readonly unknown[]> = T["length"];

/**
 * Query parameters for a search request
 * @template Fields The collection fields
 * @template Q The query string
 * @template QueryByTuple The query_by fields
 * @template L The length of the query_by fields
 */
interface QueryParams<
  Fields extends CollectionField[],
  Q extends "*" | (string & {}),
  QueryByTuple extends QueryBy<Fields> = QueryBy<Fields>,
  L extends number = LengthOf<QueryByTuple>,
> {
  q: Q;
  query_by: QueryByTuple;
  prefix?: TupleOfLength<L, boolean> | boolean;
  infix?: MapInfixValues<Fields, QueryByTuple>;
  pre_segmented_query?: boolean;
  vector_query?: string;
  preset?: string; //TODO
  voice_query?: string;
  stopwords?: string[];
}

/**
 * Generates a tuple of a specified length with a specified type
 * @template Length The length of the tuple
 * @template Type The type of the tuple
 * @template Arr Accumulator parameter for recursion
 * @example
 * type X = TupleOfLength<3, string>
 * //   ^? type X = [string, string, string]
 */
type TupleOfLength<
  Length extends number,
  Type = unknown,
  Arr extends Type[] = [],
> =
  Arr["length"] extends Length ? Arr
  : TupleOfLength<Length, Type, [...Arr, Type]>;

/**
 * Ranking parameters for a search request
 * @template Fields The collection fields
 * @template QueryByTuple The query_by fields
 * @template L The length of the query_by fields
 * @todo Add support for override_tags
 */
interface RankingParams<
  Fields extends CollectionField[],
  QueryByTuple extends QueryBy<Fields> = QueryBy<Fields>,
  L extends number = LengthOf<QueryByTuple>,
> {
  query_by_weights?: TupleOfLength<L, number>;
  prioritize_token_position?: boolean;
  prioritize_num_matching_fields?: boolean;
  prioritize_exact_match?: boolean;
  text_match_type?: "max_score" | "max_weight";
  enable_overrides?: boolean;
  override_tags?: string; //TODO
  pinned_hits?: `${string}:${string}`[];
  hidden_hits?: string[];
  filter_curated_hits?: boolean;
  enable_synonyms?: boolean;
  synonym_prefix?: boolean;
  max_candidates?: number;
}

/**
 * Facet parameters for a search request
 * @template Fields The collection fields
 * @template FacetByTuple The facet_by fields
 */
interface PaginationParams {
  page?: number;
  per_page?: number;
  offset?: number;
  limit?: number;
}

/**
 * Creates a union type representing a range of numbers from Start to End (inclusive).
 * @template Start The start of the range.
 * @template End The end of the range.
 * @template Arr Helper parameter for recursion, do not specify this manually.
 * @template Acc Helper parameter for recursion, do not specify this manually.
 * @example
 * type X = NumberRange<1, 3>
 * //   ^? type X = 1 | 2 | 3
 */
type NumberRange<
  Start extends number,
  End extends number,
  Arr extends unknown[] = [],
  Acc = never,
> =
  Arr["length"] extends End ? Acc | End
  : NumberRange<
      Start,
      End,
      [...Arr, 1],
      Arr["length"] extends Start ? Arr["length"] : Acc | Arr["length"]
    >;

/**
 * Extracts the fields from a collection schema
 * @template Fields The fields of the collection schema
 * @template QueryByTuple The query_by fields
 * @template L The length of the query_by fields
 */
interface TypoToleranceParams<
  Fields extends CollectionField[],
  QueryByTuple extends QueryBy<Fields> = QueryBy<Fields>,
  L extends number = LengthOf<QueryByTuple>,
> {
  num_typos?: TupleOfLength<L, NumberRange<0, 2>> | NumberRange<0, 2>;
  min_len_1typo?: number;
  min_len_2typo?: number;
  split_join_tokens?: OperationMode;
  typo_tokens_threshold?: number;
  drop_tokens_threshold?: number;
  drop_tokens_mode?: DropTokensMode;
  enable_typos_for_numerical_tokens?: boolean;
  enable_typos_for_alpha_numerical_tokens?: boolean;
  synonym_num_typos?: boolean;
}

/**
 * Filter parameters for a search request
 */
interface FilterParams {
  enable_lazy_filter?: boolean;
}

/**
 * Facet parameters for a search request
 * @template Fields The collection fields
 * @template FacetByTuple The facet_by fields
 */
interface FacetParams<
  Fields extends CollectionField[],
  FacetByTuple extends FacetableFieldKeys<Fields>[] | undefined,
> {
  facet_by?: FacetByTuple; // Todo
  facet_query?: string; //Todo;
  facet_return_parent?: string; //  Todo;
  facet_query_num_typos?: number;
  facet_sample_percent?: NumberRange<0, 100>;
  facet_number_threshold?: number;
}

/**
 * Group parameters for a search request
 * @template Fields The collection fields
 * @template GroupByTuple The group_by fields
 */
interface GroupParams<
  Fields extends CollectionField[],
  GroupByTuple extends FacetableFieldKeys<Fields>[] | undefined,
> {
  group_by?: GroupByTuple;
  group_limit?: number;
  group_missing_values?: boolean;
}

/**
 * Subset of a tuple
 * @template S The tuple to subset
 * @example
 * type X = SubsetTuple<["a", "b", "c"]>
 * //   ^? type X = ["a"] | ["b"] | ["c"]
 */
type SubsetTuple<S extends readonly string[]> = S[number][];

/**
 * Result parameters for a search request
 * @template Fields The collection fields
 * @template QueryByTuple The query_by fields
 * @template HighlightFieldsTuple The highlight_fields fields
 * @template IncludeFieldsTuple The include_fields fields
 * @template ExcludeFieldsTuple The exclude_fields fields
 * @template EnableV1Hightlights Whether to enable v1 highlights
 */
interface ResultParams<
  Fields extends CollectionField[],
  QueryByTuple extends QueryBy<Fields>,
  HighlightFieldsTuple extends "none" | SubsetTuple<QueryByTuple> | undefined,
  IncludeFieldsTuple extends IncludeFields<Fields> | undefined,
  ExcludeFieldsTuple extends ExcludeFields<Fields> | undefined,
  EnableV1Hightlights extends boolean,
> {
  highlight_fields?: HighlightFieldsTuple;
  highlight_full_fields?: "none" | SubsetTuple<QueryByTuple>;
  highlight_affix_num_tokens?: number;
  include_fields?: IncludeFieldsTuple;
  exclude_fields?: ExcludeFieldsTuple;
  highlight_start_tag?: string;
  highlight_end_tag?: string;
  enable_highlight_v1?: EnableV1Hightlights;
  snippet_threshold?: number;
  limit_hits?: number;
  search_cutoff_ms?: number;
  exhaustive_search?: boolean;
}

/**
 * Caching parameters for a search request
 */
interface CachingParams {
  use_cache?: boolean;
  cache_ttl?: string;
}

/**
 * Search parameters for a search request
 * @template Schema The collection schema
 * @template FilterBy The filter_by field
 * @template SortBy The sort_by field
 * @template Q The query string
 * @template QueryByTuple The query_by fields
 * @template HighlightFieldsTuple The highlight_fields fields
 * @template IncludeFieldsTuple The include_fields fields
 * @template ExcludeFieldTuple The exclude_fields fields
 * @template FacetByTuple The facet_by fields
 * @template GroupByTuple The group_by fields
 * @template L The length of the query_by fields
 * @template Fields The collection fields
 * @template EnableV1Highlights Whether to enable v1 highlights
 */
type SearchParams<
  Schema extends OmitDefaultSortingField<Collection>,
  FilterBy extends string,
  SortBy extends string,
  Q extends "*" | (string & {}),
  QueryByTuple extends QueryBy<Fields>,
  HighlightFieldsTuple extends
    | "none"
    | SubsetTuple<QueryByTuple>
    | undefined = undefined,
  IncludeFieldsTuple extends IncludeFields<Fields> | undefined = undefined,
  ExcludeFieldTuple extends ExcludeFields<Fields> | undefined = undefined,
  FacetByTuple extends FacetableFieldKeys<Fields>[] | undefined = undefined,
  GroupByTuple extends FacetableFieldKeys<Fields>[] | undefined = undefined,
  L extends number = LengthOf<QueryByTuple>,
  Fields extends CollectionField[] = ExtractFields<Schema>,
  EnableV1Highlights extends boolean = true,
> =
  ParseSort<SortBy, Schema> extends true ?
    ParseFilter<FilterBy, Schema> extends true ?
      FacetParams<Fields, FacetByTuple> &
        QueryParams<Fields, Q, QueryByTuple, L> &
        RankingParams<Fields, QueryByTuple, L> &
        FilterParams &
        GroupParams<Fields, GroupByTuple> &
        CachingParams &
        TypoToleranceParams<Fields, QueryByTuple, L> &
        PaginationParams &
        ResultParams<
          Fields,
          QueryByTuple,
          HighlightFieldsTuple,
          IncludeFieldsTuple,
          ExcludeFieldTuple,
          EnableV1Highlights
        > & {
          filter_by?: FilterBy;
          sort_by?: SortBy;
        }
    : `[Error on filter_by]: ${ParseFilter<FilterBy, Schema> & string}`
  : `[Error on sort_by]: ${ParseSort<SortBy, Schema> & string}`;

interface BaseHighlightV1<T extends CollectionField> {
  field: T["name"];
}

/**
 * Legacy highlight information for an array field
 * @template T The collection field
 */
type ArrayHighlightV1<T extends CollectionField> = BaseHighlightV1<T> & {
  indices: number[];
  matched_tokens: string[][];
  snippets: string[];
};

/**
 * Legacy highlight information for a non-array field
 * @template T The collection field
 */
type NonArrayHighlightV1<T extends CollectionField> = BaseHighlightV1<T> & {
  matched_tokens: string[];
  snippet: string;
};

/**
 * Legacy highlight information for a field
 * @template T The collection field
 */
type HighlightV1<T extends CollectionField> =
  T["type"] extends "string" ? NonArrayHighlightV1<T>
  : T["type"] extends "string[]" ? ArrayHighlightV1<T>
  : never;

/**
 * Applies highlight information to a nested object
 */
type ApplyHighlight<T, IsArray extends boolean = false> =
  T extends Record<string, infer Inner> ?
    {
      [K in keyof T]: Inner extends string ?
        IsArray extends true ?
          BaseHighlightV2[]
        : BaseHighlightV2
      : ApplyHighlight<Inner, IsArray>;
    }
  : never;

/**
 * Builds a nested object structure
 * @template Field The field to build the nested object from
 * @example
 * type X = BuildNested<"a.b.c">
 * //   ^? type X = { a: { b: { c: string } } }
 */
type BuildNested<Field extends string> =
  Field extends `${infer First}.${infer Rest}` ?
    Record<First, BuildNested<Rest>>
  : Record<Field, string>;

/**
 * Generates a nested structure from a collection schema and a field name
 * @template Fields The collection fields
 * @template Field The field name
 * @template BreakAt The breaking point for the nested structure
 * @example
 * type X = GenerateNestedStructure<[{ type: "object", name: "a" }, { type: "string", name: "a.b" }], "a.b>
 * //   ^? type X = { a: { b: string } }
 *
 *
 */
type GenerateNestedStructure<
  Fields extends CollectionField[],
  Field extends string,
  BreakAt extends string = FindBreakingPoint<Fields, DotLevels<Field>>,
> =
  Field extends `${BreakAt}.${infer Rest}` ? Record<BreakAt, BuildNested<Rest>>
  : Record<Field, string>;

type HighlightV2<T extends CollectionField, Fields extends CollectionField[]> =
  T["type"] extends "string" ?
    ApplyHighlight<GenerateNestedStructure<Fields, T["name"]>>
  : T["type"] extends "string[]" ?
    ApplyHighlight<GenerateNestedStructure<Fields, T["name"]>, true>
  : never;

interface BaseHighlightV2 {
  matched_tokens: string[];
  snippet: string;
}

/**
 * Valid fields names to exclude from a search response
 * @template T The collection fields
 */
type ExcludeFields<T extends CollectionField[]> = Exclude<
  T[number]["name"] | "out_of" | "conversation_history" | "search_time_ms",
  ObjectFields<T>[number]
>[];

/**
 * Valid fields names to include in a search response
 */
type IncludeFields<Fields extends CollectionField[]> = Exclude<
  Fields[number]["name"],
  ObjectFields<Fields>[number]
>[];

/**
 * Extracts the fields to be highlighted from the search parameters
 * @template Fields The collection fields
 * @template QueryByTuple The query_by fields
 * @template HighlightFields The highlight_fields fields
 * @template IncludeFieldsTuple The include_fields fields
 * @template ExcludeFieldsTuple The exclude_fields fields
 * @template Q The query string
 * @example
 * type X = GetHighlightsFromParams<
 * //   ^? type X = []
 *  [{ type: "string", name: "a" }, { type: "string", name: "b" }],
 * ["a"],
 * "none",
 * ["b"],
 * "foo"
 * >
 *
 * type Y = GetHighlightsFromParams<
 * //   ^? type Y = ["b"]
 * [{ type: "string", name: "a" }, { type: "string", name: "b" }],
 * ["a"],
 * undefined
 * ["b"],
 * "foo"
 * >
 *
 * type Z = GetHighlightsFromParams<
 * //   ^? type Z = ["a"]
 * [{ type: "string", name: "a" }, { type: "string", name: "b" }],
 * ["a"],
 * ["a"],
 * undefined
 * undefined,
 * "foo"
 * >
 */
type GetHighlightsFromParams<
  Fields extends CollectionField[],
  QueryByTuple extends QueryBy<Fields>,
  HighlightFields extends "none" | SubsetTuple<QueryByTuple> | undefined,
  IncludeFieldsTuple extends IncludeFields<Fields> | undefined,
  ExcludeFieldsTuple extends ExcludeFields<Fields> | undefined,
  Q extends string,
> =
  Q extends "*" ? []
  : HighlightFields extends undefined ?
    IncludeFieldsTuple extends string[] ?
      ExcludeFieldsTuple extends string[] ?
        ExcludeFromTuple<
          IntersectTuples<QueryByTuple, IncludeFieldsTuple>,
          ExcludeFieldsTuple
        >
      : IntersectTuples<QueryByTuple, IncludeFieldsTuple>
    : ExcludeFieldsTuple extends string[] ?
      ExcludeFromTuple<QueryByTuple, ExcludeFieldsTuple>
    : QueryByTuple
  : HighlightFields extends "none" ? []
  : HighlightFields;

/**
 * Extracts the fields to be included in the search response
 * @template Fields The collection fields
 * @template IncludeFieldsTuple The include_fields fields
 * @template ExcludeFieldsTuple The exclude_fields fields
 * @example
 * type X = GetFieldsInDocumentFromParams<
 * //   ^? type X = ["a"]
 * [{ type: "string", name: "a" }, { type: "string", name: "b" }],
 * ["a"],
 * ["b"]
 * >
 *
 * type Y = GetFieldsInDocumentFromParams<
 * //   ^? type Y = ["a", "b"]
 * [{ type: "string", name: "a" }, { type: "string", name: "b" }],
 * ["a","b"],
 * undefined
 * >
 *
 * type Z = GetFieldsInDocumentFromParams<
 * //   ^? type Z = []
 * [{ type: "string", name: "a" }, { type: "string", name: "b" }],
 * ["a"],
 * ["a"]
 * >
 */
type GetFieldsInDocumentFromParams<
  Fields extends CollectionField[],
  IncludeFieldsTuple extends IncludeFields<Fields> | undefined,
  ExcludeFieldsTuple extends ExcludeFields<Fields> | undefined,
> = [
  ...(IncludeFieldsTuple extends string[] ?
    ExcludeFieldsTuple extends string[] ?
      ExcludeFromTuple<IncludeFieldsTuple, ExcludeFieldsTuple>
    : IncludeFieldsTuple
  : ExcludeFieldsTuple extends string[] ?
    ExcludeFromTuple<
      { [K in keyof Fields]: Fields[K]["name"] },
      ExcludeFieldsTuple
    >
  : { [K in keyof Fields]: Fields[K]["name"] }),
  ...ObjectFields<Fields>,
];

/**
 * A helper type to check if a type is DocumentSchema
 */
type IsDocumentSchema<T> = T extends DocumentSchema ? true : false;

/**
 * Preserves array types when filtering out DocumentSchema fields
 * @template T The type to preserve
 */
type PreserveArrayType<T> =
  T extends (infer U)[] ? FilterDocumentSchemaFields<U>[]
  : T extends object ? FilterDocumentSchemaFields<T>
  : T;

/**
 * Recursively filters out DocumentSchema fields from an object type
 * @template T The type to filter
 */
type FilterDocumentSchemaFields<T> =
  T extends unknown[] ? PreserveArrayType<T>
  : T extends object ?
    {
      [K in keyof T as IsDocumentSchema<T[K]> extends true ? never
      : K]: PreserveArrayType<T[K]>;
    }
  : T;

/**
 * Extracts the document for a search hit
 * @template Fields The collection fields
 * @template FieldNames The field names to extract
 */
type DocumentFieldsMapping<
  Fields extends CollectionField[],
  FieldNames extends readonly string[],
> = FilterDocumentSchemaFields<
  InferNativeType<
    CollectionFieldFromTuple<FieldNames, Fields> & CollectionField[]
  >
>;

/**
 * Distributes the highlight information to the search response based on the version
 * @template T The collection field
 * @template Fields The collection fields
 * @template Version The highlight version
 */
type DistributeHighlight<
  T extends CollectionField,
  Fields extends CollectionField[],
  Version extends "v1" | "v2" = "v2",
> = UnionToIntersection<
  T extends CollectionField ?
    Version extends "v2" ? DeepPartial<HighlightV2<T, Fields>>
    : Version extends "v1" ? Partial<HighlightV1<T>>
    : never
  : never
>;

/**
 * Distributes the facet counts to the search response
 * @template Fields The collection fields
 * @template FacetByTuple The facet_by fields
 */
type DistributeFacetCounts<
  Fields extends CollectionField[],
  FacetByTuple extends FacetableFieldKeys<Fields>[] | undefined,
> =
  FacetByTuple extends undefined ? []
  : FacetByTuple extends readonly [...infer F] ?
    {
      [K in keyof F]: FacetCount<
        CollectionFieldFromTuple<[F[K]] & string[], Fields>[number]
      >;
    }
  : never;

/**
 * A search hit in a search response
 * @template Fields The collection fields
 * @template QueryByTuple The query_by fields
 * @template HighlightFields The highlight_fields fields
 * @template IncludeFieldsTuple The include_fields fields
 * @template ExcludeFieldsTuple The exclude_fields fields
 * @template Q The query string
 * @template EnableV1Highlights Whether to enable v1 highlights
 */
interface Hit<
  Fields extends CollectionField[],
  QueryByTuple extends QueryBy<Fields>,
  HighlightFields extends "none" | SubsetTuple<QueryByTuple> | undefined,
  IncludeFieldsTuple extends IncludeFields<Fields> | undefined,
  ExcludeFieldsTuple extends ExcludeFields<Fields> | undefined,
  Q extends string,
  EnableV1Highlights extends boolean,
  HighlightFieldNames extends string[] = GetHighlightsFromParams<
    Fields,
    QueryByTuple,
    HighlightFields,
    IncludeFieldsTuple,
    ExcludeFieldsTuple,
    Q
  >,
> {
  document: DocumentFieldsMapping<
    Fields,
    GetFieldsInDocumentFromParams<
      Fields,
      IncludeFieldsTuple,
      ExcludeFieldsTuple
    > &
      string[]
  >;
  highlight: DistributeHighlight<
    CollectionFieldFromTuple<HighlightFieldNames, Fields>[number] &
      CollectionField,
    Fields,
    "v2"
  >;
  highlights: EnableV1Highlights extends true ?
    DistributeHighlight<
      CollectionFieldFromTuple<
        RemoveMatch<HighlightFieldNames, `${string}.${string}`>,
        Fields
      >[number] &
        CollectionField,
      Fields,
      "v1"
    >[]
  : never;
  curated?: true;
  text_match: number;
  text_match_info: {
    best_field_score: `${number}`;
    best_field_weight: number;
    fields_matched: number;
    score: `${number}`;
    tokens_matched: number;
  };
}

type Split<S extends string> =
  S extends `${infer First}${infer Rest}` ? [First, ...Split<Rest>] : [];

type Join<T extends string[]> =
  T extends [] ? ""
  : T extends [infer First extends string] ? First
  : T extends [infer First extends string, ...infer Rest extends string[]] ?
    `${First}${Join<Rest>}`
  : never;

type RemoveMatch<
  Tuple extends readonly string[],
  Template extends string,
  Acc extends string[] = [],
> =
  Tuple extends (
    readonly [infer First extends string, ...infer Rest extends string[]]
  ) ?
    Join<Split<First>> extends Template ?
      RemoveMatch<Rest, Template, Acc>
    : RemoveMatch<Rest, Template, [...Acc, First]>
  : Acc;

/**
 * Facet count type for facets in a search response
 */
interface FacetCount<Field extends CollectionField> {
  counts: {
    count: number;
    highlighted: string;
    value: string;
  }[];
  field_name: Field["name"];
  sampled: boolean;
  stats: {
    total_values: number;
  };
}

/**
 * A search response
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
type SearchResponse<
  Fields extends CollectionField[],
  QueryByTuple extends QueryBy<Fields>,
  HighlightFields extends "none" | SubsetTuple<QueryByTuple> | undefined,
  IncludeFieldsTuple extends IncludeFields<Fields> | undefined,
  ExcludeFieldsTuple extends ExcludeFields<Fields> | undefined,
  FacetByTuple extends FacetableFieldKeys<Fields>[] | undefined,
  GroupByTuple extends FacetableFieldKeys<Fields>[] | undefined,
  Q extends string,
  EnableV1Highlights extends boolean,
> = {
  facet_counts: DistributeFacetCounts<Fields, FacetByTuple>;
  found: number;
  hits: Hit<
    Fields,
    QueryByTuple,
    HighlightFields,
    IncludeFieldsTuple,
    ExcludeFieldsTuple,
    Q,
    EnableV1Highlights
  >[];
  name: string;
  page: number;
  request_params: {
    collection_name?: string;
    q?: string;
    page?: number;
    per_page?: number;
    first_q?: string;
    voice_query?: {
      transcribed_query?: string;
    };
  };
} & (TupleIncludes<ExcludeFieldsTuple, "out_of"> extends true ? {}
: { out_of: number }) &
  (TupleIncludes<ExcludeFieldsTuple, "search_time_ms"> extends true ? {}
  : {
      search_time_ms: number;
    }) &
  (GroupByTuple extends undefined ? {}
  : {
      grouped_hits: {
        group_key: string[];
        hits: Hit<
          Fields,
          QueryByTuple,
          HighlightFields,
          IncludeFieldsTuple,
          ExcludeFieldsTuple,
          Q,
          EnableV1Highlights
        >[];
        found: number;
      }[];
      found_docs: number;
    });

export type {
  MapInfixValues,
  QueryBy,
  BuildNested,
  SubsetTuple,
  IncludeFields,
  GenerateNestedStructure,
  GetFieldsInDocumentFromParams,
  GetHighlightsFromParams,
  ExcludeFields,
  FacetableFieldKeys,
  SearchParams,
  LengthOf,
  ExtractFields,
  SearchResponse,
};
