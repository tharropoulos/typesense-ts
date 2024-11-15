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

type SplitByComma<T extends string> =
  T extends `${infer Head},${infer Tail}` ? [Head, ...SplitByComma<Tail>] : [T];

type Combinations<T extends string, U extends string = T> =
  T extends unknown ? T | `${T},${Combinations<Exclude<U, T>>}` : never;

type FormatCombinations<T extends string> = {
  [K in Combinations<T> as K extends string ? K : never]: K;
};

type FacetBy<T extends CollectionField[]> = FormatCombinations<
  FacetableFieldKeys<T>
>;

type MapInfixValues<T extends CollectionField[], K extends readonly string[]> =
  K extends [infer First extends string, ...infer Rest extends string[]] ?
    First extends InfixableFieldKeys<T> ?
      `${OperationMode}${Rest extends [] ? "" : ","}${Rest extends string[] ? MapInfixValues<T, Rest> : ""}`
    : `off${Rest extends [] ? "" : ","}${Rest extends string[] ? MapInfixValues<T, Rest> : ""}`
  : "";

type QueryBy<T extends CollectionField[]> = FormatCombinations<
  Extract<QueryableFields<T>[number], { name: string }>["name"]
>;

type LengthOf<T extends readonly unknown[]> = T["length"];

type ExtractFacetFields<S extends string> =
  S extends `${infer T},${infer U}` ? T | ExtractFacetFields<U> : S;

type ValidFacetQuery<
  T extends CollectionField[],
  F extends keyof FacetBy<T> | undefined,
> = F extends string ? `${ExtractFacetFields<F>}:${string}` : never;

interface QueryParams<
  Fields extends CollectionField[],
  S extends keyof QueryBy<Fields> = keyof QueryBy<Fields>,
  SplitS extends readonly string[] = SplitByComma<S>,
  L extends number = LengthOf<SplitS>,
  Stopwords extends string = string,
> {
  q: "*" | (string & {});
  query_by: S;
  prefix?: GenerateCommaPattern<L, boolean> | boolean;
  infix?: MapInfixValues<Fields, SplitS>;
  pre_segmented_query?: boolean;
  vector_query?: string;
  preset?: string; //TODO
  voice_query?: string;
  stopwords?: CommaSeparatedString<Stopwords, string>;
}
type ValidFormat<
  T extends string,
  Format extends Exclude<PropertyKey, symbol>,
> = T extends `${Format}` ? T : never;

type CommaSeparatedString<
  T extends string,
  Format extends Exclude<PropertyKey, symbol> = number,
> =
  T extends "" ? never
  : T extends `${ValidFormat<infer First, Format>},${infer Rest}` ?
    T extends `${First},${CommaSeparatedString<Rest, Format>}` ?
      T
    : "Invalid format, it should be a comma-separated string"
  : ValidFormat<T, Format>;

interface RankingParams<
  Fields extends CollectionField[],
  S extends keyof QueryBy<Fields> = keyof QueryBy<Fields>,
  SplitS extends readonly unknown[] = SplitByComma<S>,
  L extends number = LengthOf<SplitS>,
  PinnedHits extends string = string,
  HiddenHits extends string = string,
> {
  query_by_weights?: GenerateCommaPattern<L, number>;
  prioritize_token_position?: boolean;
  prioritize_num_matching_fields?: boolean;
  prioritize_exact_match?: boolean;
  text_match_type?: "max_score" | "max_weight";
  enable_overrides?: boolean;
  override_tags?: string; //TODO
  pinned_hits?: CommaSeparatedString<PinnedHits, `${string}:${string}`>;
  hidden_hits?: CommaSeparatedString<HiddenHits, string>;
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
  S extends keyof QueryBy<TFields> = keyof QueryBy<TFields>,
  SplitS extends readonly unknown[] = SplitByComma<S>,
  L extends number = LengthOf<SplitS>,
> {
  num_typos?: GenerateCommaPattern<L, NumberRange<0, 2>> | NumberRange<0, 2>;
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

// Proper subtraction that maintains literal numbers
type BuildTuple<N extends number, T extends unknown[] = []> =
  T["length"] extends N ? T : BuildTuple<N, [...T, unknown]>;

type Subtract<A extends number, B extends number> =
  BuildTuple<A> extends [...BuildTuple<B>, ...infer Rest] ? Rest["length"]
  : never;

type GenerateCommaPattern<
  L extends number,
  T = number,
  Acc extends string = `${T & Exclude<PropertyKey, symbol>}`,
> =
  L extends 1 ? Acc
  : L extends 2 ? `${Acc},${T & Exclude<PropertyKey, symbol>}`
  : GenerateCommaPattern<
      Subtract<L, 1>,
      T,
      `${Acc},${T & Exclude<PropertyKey, symbol>}`
    >;

interface FilterParams {
  enable_lazy_filter?: boolean;
}

export type SearchParams<
  Schema extends OmitDefaultSortingField<Collection>,
  FilterBy extends string,
  SortBy extends string,
  S extends keyof QueryBy<ExtractFields<Schema>> = keyof QueryBy<
    ExtractFields<Schema>
  >,
  SplitS extends readonly string[] = SplitByComma<S>,
  L extends number = LengthOf<SplitS>,
  Fields extends CollectionField[] = ExtractFields<Schema>,
  Stopwords extends string = string,
  PinnedHits extends string = string,
  HiddenHits extends string = string,
> =
  ParseSort<SortBy, Schema> extends true ?
    ParseFilter<FilterBy, Schema> extends true ?
      FacetParams<Fields> &
        QueryParams<Fields, S, SplitS, L, Stopwords> &
        RankingParams<Fields, S, SplitS, L, PinnedHits, HiddenHits> &
        FilterParams &
        GroupParams<Fields> &
        ResultParams<Fields, S, SplitS> &
        CachingParams &
        TypoToleranceParams<Fields, S, SplitS, L> &
        PaginationParams & {
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

interface ResultParams<
  Fields extends CollectionField[],
  S extends keyof QueryBy<Fields>,
  SplitS extends readonly string[] = SplitByComma<S>,
> {
  highlight_fields?:
    | FormatCombinations<SplitS[number]>[keyof FormatCombinations<
        SplitS[number]
      >]
    | "none";
  highlight_full_fields?:
    | FormatCombinations<SplitS[number]>[keyof FormatCombinations<
        SplitS[number]
      >]
    | "none";
  highlight_affix_num_tokens?: number;
  include_fields?: FormatCombinations<
    Fields[number]["name"]
  >[keyof FormatCombinations<Fields[number]["name"]>];
  exclude_fields?: FormatCombinations<
    Fields[number]["name"]
  >[keyof FormatCombinations<Fields[number]["name"]>];
  highlight_start_tag?: string;
  highlight_end_tag?: string;
  enable_highlight_v1?: boolean; // Take note of this for later responses
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
  Schema extends OmitDefaultSortingField<Collection>,
  FilterBy extends string,
  SortBy extends string,
  PinnedHits extends string,
  HiddenHits extends string,
  Stopwords extends string,
  SelectedField extends keyof QueryBy<ExtractFields<Schema>>,
  CommaSeparatedFields extends readonly string[] = SplitByComma<SelectedField>,
  QueryByLength extends number = LengthOf<CommaSeparatedFields>,
  Fields extends CollectionField[] = ExtractFields<Schema>,
>(
  _: Schema,
  params: SearchParams<
    Schema,
    FilterBy,
    SortBy,
    SelectedField,
    CommaSeparatedFields,
    QueryByLength,
    Fields,
    Stopwords,
    PinnedHits,
    HiddenHits
  >,
): SearchParams<
  Schema,
  FilterBy,
  SortBy,
  SelectedField,
  CommaSeparatedFields,
  QueryByLength,
  Fields,
  Stopwords,
  PinnedHits,
  HiddenHits
> {
  return params;
}
