import type {
  CheckReferences,
  Collection,
  CollectionField,
  Collections,
  ExtractFields,
} from "@/collection/base";
import type { OmitDefaultSortingField } from "@/lib/utils";

/**
 * Include field tokens for parsing include_fields syntax
 */
type IncludeToken =
  | IncludeReference<string, string[]>
  | IncludeWildcard<string>
  | Comma
  | Dollar
  | LParen
  | RParen
  | FieldName<string>
  | Asterisk;

/**
 * Dollar sign token to start collection references
 */
type Dollar = "$";

/**
 * Left parenthesis token
 */
type LParen = "(";

/**
 * Right parenthesis token
 */
type RParen = ")";

/**
 * Comma token for separating fields
 */
type Comma = ",";

/**
 * Asterisk token for wildcard field selection
 */
type Asterisk = "*";

/**
 * Field name token
 */
interface FieldName<T extends string> {
  type: "field_name";
  name: T;
}

/**
 * Include reference token for a collection with specific fields
 */
interface IncludeReference<
  TCollection extends string,
  TFields extends string[],
> {
  type: "include_reference";
  collection: TCollection;
  fields: TFields;
}

/**
 * Include wildcard token for all fields in a collection
 */
interface IncludeWildcard<TCollection extends string> {
  type: "include_wildcard";
  collection: TCollection;
}

/**
 * Information about an include field reference
 */
export interface IncludeInfo {
  sourceCollection: string;
  targetCollection: string;
  fields: string[] | "*";
}

/**
 * Reads a collection reference with fields from the input string
 * @template T - The input string starting after the collection name
 * @template Collection - The collection name
 * @template Fields - Accumulator for field names
 * @template CurrentField - Current field being built
 */
type ReadCollectionFields<
  T extends string,
  Collection extends string,
  Fields extends string[] = [],
  CurrentField extends string = "",
> =
  T extends `*${infer Rest}` ?
    Rest extends `)${infer Tail}` ?
      [IncludeWildcard<Collection>, Tail]
    : [`Invalid wildcard usage in collection ${Collection}`, T]
  : T extends `)${infer Rest}` ?
    CurrentField extends "" ?
      Fields extends [] ?
        [`Empty field list for collection ${Collection}`, T]
      : [IncludeReference<Collection, Fields>, Rest]
    : [IncludeReference<Collection, [...Fields, CurrentField]>, Rest]
  : T extends `,${infer Rest}` ?
    CurrentField extends "" ?
      [`Empty field name in collection ${Collection}`, T]
    : ReadCollectionFields<Rest, Collection, [...Fields, CurrentField], "">
  : T extends `$${infer Rest}` ?
    CurrentField extends "" ?
      ReadCollectionReference<Rest> extends (
        [infer NestedToken extends IncludeToken, infer Remaining extends string]
      ) ?
        NestedToken extends (
          IncludeReference<infer NestedCollection, infer NestedFields>
        ) ?
          ReadCollectionFields<
            Remaining,
            Collection,
            [
              ...Fields,
              `$${NestedCollection}(${NestedFields extends string[] ? Join<NestedFields, ","> : "*"})`,
            ],
            ""
          >
        : NestedToken extends IncludeWildcard<infer NestedCollection> ?
          ReadCollectionFields<
            Remaining,
            Collection,
            [...Fields, `$${NestedCollection}(*)`],
            ""
          >
        : [`Failed to parse nested collection reference`, T]
      : ReadCollectionReference<Rest> extends [infer Error, infer _] ?
        [Error, T]
      : [`Invalid nested collection reference`, T]
    : [
        `Nested collection reference must be at field boundary in collection ${Collection}`,
        T,
      ]
  : T extends ` ${infer Rest}` ?
    ReadCollectionFields<Rest, Collection, Fields, CurrentField>
  : T extends `${infer Char}${infer Rest}` ?
    Char extends Char ?
      ReadCollectionFields<Rest, Collection, Fields, `${CurrentField}${Char}`>
    : [`Invalid character '${Char}' in collection ${Collection}`, T]
  : [`Unclosed collection reference for ${Collection}`, T];

/**
 * Helper type to join array elements with a separator
 */
type Join<T extends string[], Sep extends string> =
  T extends [infer Head extends string, ...infer Tail extends string[]] ?
    Tail extends [] ?
      Head
    : `${Head}${Sep}${Join<Tail, Sep>}`
  : "";

/**
 * Reads a complete collection reference from the input string
 * @template T - The input string starting after the $
 * @template CollectionName - Accumulator for collection name
 */
type ReadCollectionReference<
  T extends string,
  CollectionName extends string = "",
> =
  T extends `(${infer Rest}` ?
    CollectionName extends "" ?
      [`Empty collection name`, T]
    : ReadCollectionFields<Rest, CollectionName>
  : T extends ` ${infer Rest}` ? ReadCollectionReference<Rest, CollectionName>
  : T extends `${infer Char}${infer Rest}` ?
    Char extends Char ?
      ReadCollectionReference<Rest, `${CollectionName}${Char}`>
    : [`Invalid character '${Char}' in collection name`, T]
  : [`Incomplete collection reference for ${CollectionName}`, T];

/**
 * Tokenizes an include_fields string into tokens
 * @template T - The input string to tokenize
 * @template Acc - Accumulator for tokens
 */
type IncludeTokenizer<T extends string, Acc extends IncludeToken[] = []> =
  T extends "" ? Acc
  : T extends `$${infer Rest}` ?
    ReadCollectionReference<Rest> extends (
      [infer Token extends IncludeToken, infer Remaining extends string]
    ) ?
      IncludeTokenizer<Remaining, [...Acc, Token]>
    : ReadCollectionReference<Rest> extends [infer Error, infer _] ? Error
    : never
  : T extends `,${infer Rest}` ? IncludeTokenizer<Rest, [...Acc, ","]>
  : T extends ` ${infer Rest}` ? IncludeTokenizer<Rest, Acc>
  : `Invalid syntax at: ${T}`;

/**
 * Validates that a collection reference is valid
 * @template Schema - The source collection schema
 * @template TargetCollection - The target collection name
 * @template Fields - The fields to include
 */
type ValidateIncludeReference<
  Schema extends OmitDefaultSortingField<Collection>,
  TargetCollection extends string,
  Fields extends string[] | "*",
> =
  Schema["name"] extends keyof CheckReferences ?
    TargetCollection extends keyof Collections ?
      TargetCollection extends CheckReferences[Schema["name"]] ?
        Fields extends "*" ? true
        : Fields extends string[] ?
          ValidateFields<Collections[TargetCollection], Fields>
        : false
      : `Collection '${TargetCollection}' is not referenced by '${Schema["name"]}'`
    : `Collection '${TargetCollection}' is not registered`
  : `Collection '${Schema["name"]}' is not registered`;

/**
 * Validates that all requested fields exist in the target collection
 * @template TargetSchema - The target collection schema
 * @template Fields - The fields to validate
 */
type ValidateFields<
  TargetSchema extends OmitDefaultSortingField<Collection>,
  Fields extends string[],
  ValidFields extends string[] = ExtractFields<TargetSchema>[number]["name"][],
> =
  Fields extends [infer Head extends string, ...infer Tail extends string[]] ?
    Head extends `$${infer NestedRef}` ?
      ValidateNestedReference<TargetSchema, NestedRef> extends true ?
        ValidateFields<TargetSchema, Tail, ValidFields>
      : ValidateNestedReference<TargetSchema, NestedRef>
    : Head extends ValidFields[number] ?
      ValidateFields<TargetSchema, Tail, ValidFields>
    : `Field '${Head}' does not exist in collection '${TargetSchema["name"]}'`
  : true;

/**
 * Validates a nested collection reference within a field list
 * @template SourceSchema - The source collection schema
 * @template NestedRef - The nested reference string (e.g., "comments(*)" or "comments(content)")
 */
type ValidateNestedReference<
  SourceSchema extends OmitDefaultSortingField<Collection>,
  NestedRef extends string,
> =
  NestedRef extends `${infer NestedCollection}(*)` ?
    ValidateIncludeReference<SourceSchema, NestedCollection, "*">
  : NestedRef extends `${infer NestedCollection}(${infer FieldList})` ?
    ParseFieldList<FieldList> extends infer ParsedFields extends string[] ?
      ValidateIncludeReference<SourceSchema, NestedCollection, ParsedFields>
    : `Invalid field list in nested reference: ${NestedRef}`
  : `Invalid nested reference format: ${NestedRef}`;

/**
 * Parses a comma-separated field list into an array
 * @template FieldList - The field list string (e.g., "title,content")
 */
type ParseFieldList<FieldList extends string> =
  FieldList extends `${infer Head},${infer Tail}` ?
    [Head, ...ParseFieldList<Tail>]
  : FieldList extends "" ? []
  : [FieldList];

/**
 * Validates an array of include tokens
 * @template Tokens - The tokens to validate
 * @template Schema - The source collection schema
 */
type ValidateIncludeTokens<
  Tokens extends IncludeToken[],
  Schema extends OmitDefaultSortingField<Collection>,
> =
  Tokens extends (
    [infer Head extends IncludeToken, ...infer Tail extends IncludeToken[]]
  ) ?
    Head extends IncludeReference<infer Collection, infer Fields> ?
      ValidateIncludeReference<Schema, Collection, Fields> extends true ?
        ValidateIncludeTokens<Tail, Schema>
      : ValidateIncludeReference<Schema, Collection, Fields>
    : Head extends IncludeWildcard<infer Collection> ?
      ValidateIncludeReference<Schema, Collection, "*"> extends true ?
        ValidateIncludeTokens<Tail, Schema>
      : ValidateIncludeReference<Schema, Collection, "*">
    : Head extends "," ? ValidateIncludeTokens<Tail, Schema>
    : "Invalid token in include fields"
  : true;

/**
 * Extracts include information from validated tokens
 * @template Tokens - The validated tokens
 * @template Schema - The source collection schema
 * @template Acc - Accumulator for include info
 */
type ExtractIncludeInfo<
  Tokens extends IncludeToken[],
  Schema extends OmitDefaultSortingField<Collection>,
  Acc extends IncludeInfo[] = [],
> =
  Tokens extends (
    [infer Head extends IncludeToken, ...infer Tail extends IncludeToken[]]
  ) ?
    Head extends IncludeReference<infer Collection, infer Fields> ?
      ExtractIncludeInfo<
        Tail,
        Schema,
        [
          ...Acc,
          {
            sourceCollection: Schema["name"];
            targetCollection: Collection;
            fields: Fields;
          },
        ]
      >
    : Head extends IncludeWildcard<infer Collection> ?
      ExtractIncludeInfo<
        Tail,
        Schema,
        [
          ...Acc,
          {
            sourceCollection: Schema["name"];
            targetCollection: Collection;
            fields: "*";
          },
        ]
      >
    : ExtractIncludeInfo<Tail, Schema, Acc>
  : Acc;

/**
 * Parse result for include fields
 */
export interface ParseIncludeResult<
  T extends string,
  Schema extends OmitDefaultSortingField<Collection>,
> {
  isValid: ParseIncludeFields<T, Schema> extends true ? true : false;
  errors: ParseIncludeFields<T, Schema> extends string ?
    ParseIncludeFields<T, Schema>
  : never;
  includes: ParseIncludeFields<T, Schema> extends true ?
    ExtractIncludeInfo<
      IncludeTokenizer<T> extends infer Tokens extends IncludeToken[] ? Tokens
      : [],
      Schema
    >
  : [];
}

/**
 * Main parser for include fields
 * @template T - The input string to parse
 * @template Schema - The source collection schema
 */
type ParseIncludeFields<
  T extends string,
  Schema extends OmitDefaultSortingField<Collection>,
> =
  T extends "" ? true
  : IncludeTokenizer<T> extends infer Tokens extends IncludeToken[] ?
    ValidateIncludeTokens<Tokens, Schema>
  : IncludeTokenizer<T>;

/**
 * Enhanced IncludeFields type that returns dot-notated field tuples
 * @template T - The input string or schema
 * @template Schema - The source collection schema
 */
export type IncludeFields<
  T extends string,
  Schema extends OmitDefaultSortingField<Collection>,
> =
  ParseIncludeFields<T, Schema> extends true ? GetFieldTuples<T, Schema>
  : ParseIncludeFields<T, Schema>;

/**
 * Extracts field tuples from a validated include string
 * @template T - The input string
 * @template Schema - The source collection schema
 */
type GetFieldTuples<
  T extends string,
  Schema extends OmitDefaultSortingField<Collection>,
> =
  IncludeTokenizer<T> extends infer Tokens extends IncludeToken[] ?
    FlattenFieldTuples<ExtractFieldTuples<Tokens, Schema>>
  : "nevere";

/**
 * Extracts field tuples from include tokens
 * @template Tokens - The include tokens
 * @template Schema - The source collection schema
 */
type ExtractFieldTuples<
  Tokens extends IncludeToken[],
  Schema extends OmitDefaultSortingField<Collection>,
  Acc extends string[][] = [],
> =
  Tokens extends (
    [infer Head extends IncludeToken, ...infer Tail extends IncludeToken[]]
  ) ?
    Head extends IncludeReference<infer Collection, infer Fields> ?
      ExtractFieldTuples<
        Tail,
        Schema,
        [...Acc, BuildFieldTuple<Collection, Fields>]
      >
    : Head extends IncludeWildcard<infer Collection> ?
      ExtractFieldTuples<Tail, Schema, [...Acc, BuildWildcardTuple<Collection>]>
    : ExtractFieldTuples<Tail, Schema, Acc>
  : Acc;

/**
 * Builds a field tuple for specific fields
 * @template Collection - The target collection name
 * @template Fields - The specific fields to include
 */
type BuildFieldTuple<
  Collection extends string,
  Fields extends string[],
> = FlattenNestedFields<{
  [K in keyof Fields]: Fields[K] extends string ?
    Fields[K] extends `$${infer NestedRef}` ?
      ProcessNestedReference<Collection, NestedRef>
    : `${Collection}.${Fields[K]}`
  : never;
}>;

/**
 * Flattens nested field results into a single array
 * @template T - The tuple that might contain nested arrays
 */
type FlattenNestedFields<T extends readonly unknown[]> =
  T extends readonly [infer Head, ...infer Tail] ?
    Head extends readonly string[] ? [...Head, ...FlattenNestedFields<Tail>]
    : Head extends string ? [Head, ...FlattenNestedFields<Tail>]
    : FlattenNestedFields<Tail>
  : [];

/**
 * Converts a readonly array to a mutable array
 * @template T - The readonly array to convert
 */
type Mutable<T extends readonly unknown[]> = [...T];

/**
 * Processes a nested collection reference and returns properly formatted field names
 * @template ParentCollection - The parent collection name
 * @template NestedRef - The nested reference string (e.g., "comments_include(*)" or "comments_include(content)")
 */
type ProcessNestedReference<
  ParentCollection extends string,
  NestedRef extends string,
> =
  NestedRef extends `${infer NestedCollection}(*)` ?
    NestedCollection extends keyof Collections ?
      ExtractFields<Collections[NestedCollection]> extends (
        infer Fields extends readonly CollectionField[]
      ) ?
        {
          [K in keyof Fields]: Fields[K] extends (
            { name: infer Name extends string }
          ) ?
            `${ParentCollection}.${NestedCollection}.${Name}`
          : never;
        }
      : never
    : never
  : NestedRef extends `${infer NestedCollection}(${infer FieldList})` ?
    ParseFieldList<FieldList> extends infer ParsedFields extends string[] ?
      NestedCollection extends keyof Collections ?
        BuildNestedFieldTuple<
          `${ParentCollection}.${NestedCollection}`,
          ParsedFields
        >
      : never
    : never
  : never;

/**
 * Builds field tuples for nested collection fields
 * @template NestedPath - The nested collection path (e.g., "posts_include.comments_include")
 * @template Fields - The fields to include from the nested collection
 */
type BuildNestedFieldTuple<
  NestedPath extends string,
  Fields extends string[],
> = FlattenNestedFields<{
  [K in keyof Fields]: Fields[K] extends string ?
    Fields[K] extends `$${infer DeepNestedRef}` ?
      ProcessNestedReference<NestedPath, DeepNestedRef>
    : `${NestedPath}.${Fields[K]}`
  : never;
}>;

/**
 * Builds a wildcard field tuple (all fields as a proper tuple)
 * @template Collection - The target collection name
 */
type BuildWildcardTuple<Collection extends string> =
  Collection extends keyof Collections ?
    ExtractFields<Collections[Collection]> extends (
      infer Fields extends readonly CollectionField[]
    ) ?
      Mutable<{
        [K in keyof Fields]: Fields[K] extends (
          { name: infer Name extends string }
        ) ?
          `${Collection}.${Name}`
        : never;
      }>
    : never
  : never;

/**
 * Extracts field names from a collection schema as a union
 * @template Schema - The collection schema
 */
type ExtractFieldNames<Schema extends OmitDefaultSortingField<Collection>> =
  ExtractFields<Schema> extends infer Fields extends readonly unknown[] ?
    Fields extends readonly { name: infer Name }[] ?
      Name extends string ?
        Name
      : never
    : never
  : never;

/**
 * Enhanced include field validation that works with both strings and schemas
 * @template T - The input (string or schema)
 * @template Schema - The source collection schema
 */
export type ValidateIncludeFields<
  T extends string | OmitDefaultSortingField<Collection>,
  Schema extends OmitDefaultSortingField<Collection>,
> =
  T extends string ?
    ParseIncludeFields<T, Schema> extends true ?
      true
    : ParseIncludeFields<T, Schema>
  : T extends OmitDefaultSortingField<Collection> ? true
  : false;

/**
 * Get include information from either parsed fields or schema
 * @template T - The input (string or schema)
 * @template Schema - The source collection schema
 */
export type GetIncludeInfo<
  T extends string | OmitDefaultSortingField<Collection>,
  Schema extends OmitDefaultSortingField<Collection>,
> =
  T extends string ?
    ParseIncludeFields<T, Schema> extends true ?
      ExtractIncludeInfo<
        IncludeTokenizer<T> extends infer Tokens extends IncludeToken[] ? Tokens
        : [],
        Schema
      >
    : []
  : T extends OmitDefaultSortingField<Collection> ?
    [
      {
        sourceCollection: Schema["name"];
        targetCollection: T["name"];
        fields: ExtractFieldNames<T>[];
      },
    ]
  : [];

/**
 * Flattens nested field tuple arrays into a single tuple
 * @template Tuples - Array of field tuple arrays
 */
type FlattenFieldTuples<Tuples extends string[][]> =
  Tuples extends (
    [infer Head extends string[], ...infer Tail extends string[][]]
  ) ?
    [...Head, ...FlattenFieldTuples<Tail>]
  : [];

export type {
  IncludeToken,
  IncludeReference,
  IncludeWildcard,
  FieldName,
  IncludeTokenizer,
  ParseIncludeFields,
  ValidateIncludeReference,
  ValidateFields,
  ExtractIncludeInfo,
};
