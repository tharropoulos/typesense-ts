import type { GetSchemaFromName, GlobalCollections } from "@/collection";
import type { Configuration } from "@/config";
import type { ParseFilter } from "@/lexer/filter";
import type { ParseSort } from "@/lexer/sort";
import type { OmitDefaultSortingField } from "@/lib/utils";

interface Query {
  query: string;
  match: "exact" | "contains";
}

type OverrideCreate<
  CollectionName extends GlobalCollections[keyof GlobalCollections]["name"],
  Schema extends OmitDefaultSortingField<GetSchemaFromName<CollectionName>>,
  FilterBy extends string,
  SortBy extends string,
  Tags extends readonly string[],
> =
  ParseSort<SortBy, Schema> extends true ?
    ParseFilter<FilterBy, Schema> extends true ?
      {
        collection: CollectionName;
        includes?: { id: string; position: number }[];
        remove_matched_tokens?: boolean;
        replace_query?: string;
        excludes?: { id: string }[];
        filter_curated_hits?: boolean;
        effective_from_ts?: number;
        filter_by?: FilterBy;
        sort_by?: SortBy;
        effective_to_ts?: number;
        stop_processing?: boolean;
        metadata?: Record<string, unknown>;
        rule: Query | { tags: Tags };
      }
    : `[Error on filter_by]: ${ParseFilter<FilterBy, Schema> & string}`
  : `[Error on sort_by]: ${ParseSort<SortBy, Schema> & string}`;

type Override<
  OverrideName extends string,
  CollectionName extends GlobalCollections[keyof GlobalCollections]["name"],
  Schema extends OmitDefaultSortingField<GetSchemaFromName<CollectionName>>,
  FilterBy extends string,
  SortBy extends string,
  Tags extends readonly string[],
> = Omit<
  OverrideCreate<CollectionName, Schema, FilterBy, SortBy, Tags>,
  "rule"
> & {
  rule: Tags extends readonly [] ? Query : { tags: Tags };
  name: OverrideName;
  collection: CollectionName;
};

interface OverrideOperations<
  OverrideName extends string,
  CollectionName extends GlobalCollections[keyof GlobalCollections]["name"],
  Schema extends OmitDefaultSortingField<GetSchemaFromName<CollectionName>>,
  FilterBy extends string,
  SortBy extends string,
  Tags extends readonly string[],
> {
  readonly override: Override<
    OverrideName,
    CollectionName,
    Schema,
    FilterBy,
    SortBy,
    Tags
  >;

  retrieve(
    config?: Configuration,
  ): Promise<
    Override<OverrideName, CollectionName, Schema, FilterBy, SortBy, Tags>
  >;

  upsert(
    config?: Configuration,
  ): Promise<
    Override<OverrideName, CollectionName, Schema, FilterBy, SortBy, Tags>
  >;

  delete(config?: Configuration): Promise<{ id: string }>;
}

type CheckCollectionOverrides<T extends string> =
  T extends GlobalCollections[keyof GlobalCollections]["name"] ?
    {
      [K in keyof GlobalOverrides]: GlobalOverrides[K] extends (
        { collection: infer CollectionName; rule: { tags: infer Tags } }
      ) ?
        CollectionName extends T ?
          Tags extends readonly (infer U)[] ?
            U[]
          : never
        : `[Error on tags]: No tags found for collection ${T}`
      : never;
    }[keyof GlobalOverrides]
  : `[Error on collection name]: ${T} is not registered in GlobalCollections`;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GlobalOverrides {}

export type {
  OverrideCreate,
  OverrideOperations,
  GlobalOverrides,
  CheckCollectionOverrides,
  Override,
};
