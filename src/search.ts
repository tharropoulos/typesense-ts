import type {
  Collection,
  CollectionField,
  ExtractFields,
  FacetableFieldKeys,
  InfixableFieldKeys,
  QueryableFields,
} from "@/collection/base";
import type { ParseFilter } from "@/lexer/filter";
import type { ParseSort } from "@/lexer/sort";
import type { OmitDefaultSortingField } from "@/lib/utils";

type OperationMode = "off" | "always" | "fallback";

type DropTokensMode = "right_to_left" | "left_to_right" | "both_sides:3";

export type Remove<T, ToRemove extends string, Collect extends string = ""> =
  T extends `${infer Head}${infer Remaining}` ?
    Remove<
      Remaining,
      ToRemove,
      `${Collect}${Head extends ToRemove ? "" : Head}`
    >
  : Collect;

type Combinations<T extends string, U extends string = T> =
  T extends unknown ? T | `${T},${Combinations<Exclude<U, T>>}` : never;

type FormatCombinations<T extends string> = {
  [K in Combinations<T> as K extends string ? K : never]: K;
};

type FacetBy<T extends CollectionField[]> = FormatCombinations<
  FacetableFieldKeys<T>
>;

type MapInfixValues<T extends CollectionField[], K extends readonly string[]> =
  K extends readonly [unknown, ...unknown[]] ?
    {
      [P in keyof K]: K[P] extends InfixableFieldKeys<T> ? OperationMode
      : "off";
    }
  : never;

export type QueryBy<T extends CollectionField[]> = Extract<
  QueryableFields<T>[number],
  { name: string }
>["name"][];

type LengthOf<T extends readonly unknown[]> = T["length"];

type ExtractFacetFields<S extends string> =
  S extends `${infer T},${infer U}` ? T | ExtractFacetFields<U> : S;

type ValidFacetQuery<
  T extends CollectionField[],
  F extends keyof FacetBy<T> | undefined,
> = F extends string ? `${ExtractFacetFields<F>}:${string}` : never;

interface QueryParams<
  Fields extends CollectionField[],
  S extends QueryBy<Fields> = QueryBy<Fields>,
  L extends number = LengthOf<S>,
> {
  q: "*" | (string & {});
  query_by: S;
  prefix?: TupleOfLength<L, boolean> | boolean;
  infix?: MapInfixValues<Fields, S>;
  pre_segmented_query?: boolean;
  vector_query?: string;
  preset?: string; //TODO
  voice_query?: string;
  stopwords?: string[];
}

type TupleOfLength<
  Length extends number,
  Type = unknown,
  Arr extends Type[] = [],
> =
  Arr["length"] extends Length ? Arr
  : TupleOfLength<Length, Type, [...Arr, Type]>;

interface RankingParams<
  Fields extends CollectionField[],
  S extends QueryBy<Fields> = QueryBy<Fields>,
  L extends number = LengthOf<S>,
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

interface TypoToleranceParams<
  TFields extends CollectionField[],
  S extends QueryBy<TFields> = QueryBy<TFields>,
  L extends number = LengthOf<S>,
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
interface FilterParams {
  enable_lazy_filter?: boolean;
}

export type SearchParams<
  Schema extends OmitDefaultSortingField<Collection>,
  FilterBy extends string,
  SortBy extends string,
  S extends QueryBy<ExtractFields<Schema>> = QueryBy<ExtractFields<Schema>>,
  L extends number = LengthOf<S>,
  Fields extends CollectionField[] = ExtractFields<Schema>,
> =
  ParseSort<SortBy, Schema> extends true ?
    ParseFilter<FilterBy, Schema> extends true ?
      FacetParams<Fields> &
        QueryParams<Fields, S, L> &
        RankingParams<Fields, S, L> &
        FilterParams &
        GroupParams<Fields> &
        CachingParams &
        TypoToleranceParams<Fields, S, L> &
        PaginationParams &
        ResultParams<Fields, S> & {
          filter_by?: FilterBy;
          sort_by?: SortBy;
        }
    : `[Error on filter_by]: ${ParseFilter<FilterBy, Schema> & string}`
  : `[Error on sort_by]: ${ParseSort<SortBy, Schema> & string}`;

interface FacetParams<Fields extends CollectionField[]> {
  facet_by?: keyof FacetBy<Fields> | (string & {}); //Todo;
  facet_query?: ValidFacetQuery<Fields, keyof FacetBy<Fields>> | (string & {}); //Todo;
  facet_return_parent?: string; //  Todo;
  facet_query_num_typos?: number;
  facet_sample_percent?: NumberRange<0, 100>;
  facet_number_threshold?: number;
}

interface GroupParams<Fields extends CollectionField[]> {
  group_by?: keyof FacetBy<Fields>;
  group_limit?: number;
  group_missing_values?: boolean;
}
type SubsetTuple<S extends readonly string[]> = S[number][];

interface ResultParams<
  Fields extends CollectionField[],
  S extends QueryBy<Fields>,
> {
  highlight_fields?: "none" | SubsetTuple<S>;
  highlight_full_fields?: "none" | SubsetTuple<S>;
  highlight_affix_num_tokens?: number;
  include_fields?: Fields[number]["name"][];
  exclude_fields?: Fields[number]["name"][];
  highlight_start_tag?: string;
  highlight_end_tag?: string;
  enable_highlight_v1?: boolean;
  snippet_threshold?: number;
  limit_hits?: number;
  search_cutoff_ms?: number;
  exhaustive_search?: boolean;
}

interface CachingParams {
  use_cache?: boolean;
  cache_ttl?: string;
}

export function search<
  const Schema extends OmitDefaultSortingField<Collection>,
  const FilterBy extends string,
  const SortBy extends string,
  const SelectedField extends QueryBy<ExtractFields<Schema>>,
  const QueryByLength extends number = LengthOf<SelectedField>,
  const Fields extends CollectionField[] = ExtractFields<Schema>,
>(
  _: Schema,
  params: SearchParams<
    Schema,
    FilterBy,
    SortBy,
    SelectedField,
    QueryByLength,
    Fields
  >,
): SearchParams<
  Schema,
  FilterBy,
  SortBy,
  SelectedField,
  QueryByLength,
  Fields
> {
  return params;
}
