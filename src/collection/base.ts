/**
 * All field types that can be used in a collection schema.
 * [Reference](https://typesense.org/docs/27.0/api/collections.html#field-types)
 */
type FieldType =
  | "string"
  | "int32"
  | "int64"
  | "float"
  | "bool"
  | "geopoint"
  | "geopoint[]"
  | "string[]"
  | "int32[]"
  | "int64[]"
  | "float[]"
  | "bool[]"
  | "object"
  | "object[]"
  | "auto"
  | "string*"
  | "image";

/**
 * A type that represents a valid document schema.
 */
type DocumentSchema = Record<string, FieldType | NestedSchema>;

/**
 * A type that represents a nested schema.
 */
interface NestedSchema {
  [key: string]: FieldType | NestedSchema;
}

/**
 * A type that maps field types to their native types.
 */
interface FieldTypeToNativeTypeMap {
  string: string;
  int32: number;
  int64: number;
  float: number;
  bool: boolean;
  geopoint: [number, number];
  "geopoint[]": [number, number][];
  "string[]": string[];
  "int32[]": number[];
  "int64[]": number[];
  "float[]": number[];
  "bool[]": boolean[];
  auto: unknown;
  "string*": string;
  image: string;
}

/**
 * A type that infers the native type of a field.
 * @template T The field.
 */
type InferNativeTypeForField<T extends CollectionField> =
  T["optional"] extends true
    ?
        | FieldTypeToNativeTypeMap[T["type"] & keyof FieldTypeToNativeTypeMap]
        | undefined
    : FieldTypeToNativeTypeMap[T["type"] & keyof FieldTypeToNativeTypeMap];

/**
 * A type that represents a facet index constraint.
 */
type FacetIndexConstraint =
  | {
      index?: true;
    }
  | {
      index: false;
      facet?: false;
    };

/**
 * A type that represents all default sortable field types.
 */
type SortableTypes = "int32" | "float" | "int64";

type CounterTypes = "int32" | "int64";

/**
 * Extracts counter field keys from a collection schema
 * @template T The collection schema type
 */
type CouldBeCounterField<T extends CollectionField> = T extends {
  type: CounterTypes;
  store?: true;
  optional?: false;
}
  ? true
  : false;

type CounterFields<T extends CollectionField[]> = T[number] extends infer F
  ? F extends CollectionField
    ? CouldBeCounterField<F> extends true
      ? F["name"]
      : never
    : never
  : never;

/**
 * Helper type that checks if a field is sortable.
 * @template T The field schema.
 */
type IsSortable<T extends CollectionField> = T["sort"] extends true
  ? true
  : T["type"] extends SortableTypes
    ? T["sort"] extends false
      ? false
      : true
    : false;

/**
 * Helper type that checks if a field can be used as the default sorting field.
 * @template T The field schema.
 */
type CouldBeDefaultSortingField<T extends CollectionField> =
  T["optional"] extends true
    ? false
    : IsSortable<T> extends true
      ? true
      : false;

type SortableFields<T extends Record<string, CollectionField>> = {
  [K in keyof T]: IsSortable<T[K]> extends true ? K : never;
}[keyof T] &
  string;

/**
 * Helper type that extracts the keys of fields that have specific boolean field set to `true`.
 */
type IsFieldKeyTrue<
  T extends CollectionField,
  K extends keyof T,
> = T[K] extends true ? K : never;

/**
 * Helper type that extracts the keys of fields that have the `facet` parameter set to `true`.
 * @template T The collection's fields.
 */
type FacetableFieldKeys<T extends Record<string, CollectionField>> = {
  [K in keyof T]: IsFieldKeyTrue<T[K], "facet"> extends never ? never : K;
}[keyof T] &
  string;

/**
 * Helper type that extracts the keys of fields that have the `infix` parameter set to `true`.
 * @template T The collection's fields.
 */
type InfixableFieldKeys<T extends Record<string, CollectionField>> = {
  [K in keyof T]: IsFieldKeyTrue<T[K], "infix"> extends never ? never : K;
}[keyof T] &
  string;

/**
 * A type that represents a base field schema.
 * @template T The name of the field.
 */
type BaseField<T extends string = string> = FacetIndexConstraint & {
  name: T;
  optional?: boolean;
  facet?: boolean;
  sort?: boolean;
  locale?: string;
  infix?: boolean;
  stem?: boolean;
  store?: boolean;
  [key: string]: unknown;
};

/**
 * A type that represents a regular field schema.
 * @template T The name of the field.
 */
type RegularField<T extends string = string> = BaseField<T> & {
  type: FieldType;
  embed?: never;
  reference?: never;
  num_dim?: never;
  hnsw_params?: never;
  vec_dist?: never;
};

/**
 * A type that represents a reference field schema. For more information, refer to the
 * [JOINs Documentation](https://typesense.org/docs/27.0/api/joins.html).
 */
type ReferenceField<T extends string = string> = BaseField<T> & {
  name: T;
  type: FieldType;
  embed?: never;
  num_dim?: never;
  hnsw_params?: never;
  vec_dist?: never;
  reference: DotSeparatedString;
};

/**
 * A type that represents an embedding field schema. For more information, refer to the
 * [Vector Search Documentation](https://typesense.org/docs/27.0/api/vector-search.html#nearest-neighbor-vector-search).
 * @template T The name of the field.
 * @template K The name of the fields to embed from.
 */
type EmbeddingField<
  T extends string = string,
  K extends string = string,
> = FloatArrayField<T> & {
  embed: {
    from: K[];
    model_config: {
      model_name: string;
      api_key?: string;
      indexing_prefix?: string;
      query_prefix?: string;
      url?: string;
      access_token?: string;
      refresh_token?: string;
      client_id?: string;
      client_secret?: string;
      project_id?: string;
    };
  };
};

type FloatArrayField<T extends string = string> = BaseField<T> & {
  type: "float[]";
  reference?: never;
  num_dim?: number;
  hnsw_params?: {
    ef_construction?: number;
    M?: number;
  };
  vec_dist?: "cosine" | "ip";
};

/**
 * A type that represents a field schema for a collection. For more information, refer to the
 * [Collection Documentation](https://typesense.org/docs/27.0/api/collections.html#schema-parameters).
 * @template T The name of the field.
 * @template K The name of the fields to embed from.
 */
type CollectionField<T extends string = string, K extends string = string> =
  | RegularField<T>
  | EmbeddingField<T, K>
  | ReferenceField<T>
  | FloatArrayField<T>;

type EmbeddableFieldNames<T extends CollectionField<string, string>[]> = {
  [K in T[number]["name"]]: Extract<T[number], { name: K }> extends infer Field
    ? Field extends CollectionField<string, string>
      ? Field["type"] extends "string" | "string[]" | "text"
        ? K
        : never
      : never
    : never;
}[T[number]["name"]];

/**
 * Extracts all the field paths from a record of collection schemas.
 * @template T The collection schema record.
 */
type _CollectionFieldPathsRecord<T> = {
  [K in keyof T]: T[K] extends {
    name: infer Name;
    fields: infer Fields;
  }
    ? Name extends string
      ? Fields extends Record<string, { name: string }>
        ? {
            [F in keyof Fields]: Fields[F] extends { name: infer FieldName }
              ? FieldName extends string
                ? `${Name}.${FieldName}`
                : never
              : never;
          }[keyof Fields]
        : never
      : never
    : never;
}[keyof T];

/**
 * Extracts all the field paths from a collection schema.
 * @template T The collection schema.
 */
type _CollectionFieldPaths<T> = T extends {
  name: infer Name;
  fields: infer Fields;
}
  ? Name extends string
    ? Fields extends Record<string, { name: string; type: FieldType }>
      ? {
          [K in keyof Fields]: Fields[K] extends {
            name: infer FieldName;
            type: infer Type;
          }
            ? Type extends keyof Omit<
                FieldTypeToNativeTypeMap,
                "object" | "object[]"
              >
              ? FieldName extends string
                ? `${Name}.${FieldName}`
                : never
              : never
            : never;
        }[keyof Fields]
      : never
    : never
  : never;

type DotSeparatedString = `${string}.${string}`;

/**
 * Enforces that the `name` field of each field schema matches the key of the field.
 * @template T The collection schema.
 */
type EnforceKeyAndNameMatch<
  T extends Record<string, CollectionField<string, keyof T & string>>,
> = {
  [K in keyof T]: T[K] & { name: K };
};
type StrictDefaultSort<T> = undefined extends T ? undefined : T;

/**
 * A type that represents a valid collection schema. For more information, refer to the
 * [Collection Documentation](https://typesense.org/docs/27.0/api/collections.html#schema-parameters).
 * @template Fields The fields of the collection.
 * @template Name The name of the collection.
 */
type CollectionCreate<
  Fields extends CollectionField<string, string>[],
  Name extends string,
  DefaultSort extends
    | DefaultSortingFields<Fields>
    | undefined = DefaultSortingFields<Fields>,
> = EnforceNestedFields<Fields> & {
  fields: {
    [K in keyof Fields]: Fields[K] extends EmbeddingField<infer T, string>
      ? {
          [P in keyof Fields[K]]: Fields[K][P];
        } & EmbeddingField<T, EmbeddableFieldNames<Fields>>
      : {
          [P in keyof Fields[K]]: Fields[K][P];
        };
  };
  name: Name;
  default_sorting_field: DefaultSort extends undefined
    ? undefined
    : StrictDefaultSort<DefaultSort>;
  symbols_to_index?: string[];
  token_separators?: string[];
  metadata?: Record<string, unknown>;
  voice_query_model?: {
    model_name: string;
  };
};

/**
 * Helper type that checks which fields can be set as a default sorting field.
 * @template T The collection's fields.
 */
type DefaultSortingFields<T extends CollectionField<string, string>[]> = {
  [K in T[number]["name"]]: Extract<T[number], { name: K }> extends infer Field
    ? Field extends CollectionField<string, string>
      ? CouldBeDefaultSortingField<Field> extends true
        ? K
        : never
      : never
    : never;
}[T[number]["name"]];

/**
 * A type that enforces the `enable_nested_fields` parameter when a collection has nested fields.
 * @template T The collection's fields.
 */
type EnforceNestedFields<Fields extends CollectionField<string, string>[]> =
  WhichObjectFields<Fields> extends never
    ? { enable_nested_fields?: boolean }
    : { enable_nested_fields: true };

/**
 * Helper type that extracts the keys of fields that are of type `object` or `object[]`.
 * @template T The collection's fields.
 */
type WhichObjectFields<Fields extends CollectionField<string, string>[]> = {
  [K in Fields[number]["name"]]: Extract<
    Fields[number],
    { name: K }
  >["type"] extends "object" | "object[]"
    ? K
    : never;
}[Fields[number]["name"]];

/**
 * A type that enforces unique field names in a collection schema.
 * @template T The collection's fields.
 */
type _EnforceUniqueFieldNames<T extends CollectionField<string, string>[]> =
  T extends [infer First, ...infer Rest]
    ? First extends CollectionField<string, string>
      ? Rest extends CollectionField<string, string>[]
        ? First["name"] extends Rest[number]["name"]
          ? ["Error: Duplicate field name found", First["name"]]
          : [First, ..._EnforceUniqueFieldNames<Rest>]
        : [First]
      : never
    : [];

/**
 * A type that infers the names of the fields in a collection schema.
 * @template T The collection's fields.
 */
type _InferTupleNames<T extends CollectionField<string, string>[]> = {
  [K in keyof T]: T[K] & { name: NonNullable<T[K]["name"] & string> };
};

/**
 * The options to create a collection in Typesense.
 * @property src_name The name of the source collection.
 */
type CreateOptions = {
  src_name?: string;
} & Record<string, string>;

/**
 * The options to delete a collection in Typesense.
 */
type DeleteOptions = {
  compact_store?: boolean;
} & Record<string, string>;

type Collection<
  Fields extends CollectionField<string, string>[] = CollectionField<
    string,
    string
  >[],
  Name extends string = string,
  DefaultSort extends DefaultSortingFields<Fields> | undefined =
    | DefaultSortingFields<Fields>
    | undefined,
> = CollectionCreate<Fields, Name, DefaultSort>;

/**
 * The function to create a collection in Typesense.
 *
 * @param schema The collection schema.
 * @returns The collection schema.
 */
function collection<
  const Fields extends CollectionField<string, string>[],
  const Name extends string,
  const DefaultSort extends
    | DefaultSortingFields<Fields>
    | undefined = undefined,
>(
  schema: Omit<
    CollectionCreate<Fields, Name, DefaultSort>,
    "fields" | "default_sorting_field"
  > & {
    name: Name;
    default_sorting_field?: DefaultSort;
    fields: {
      [K in keyof Fields]: Fields[K] extends EmbeddingField
        ? EmbeddingField<
            Fields[K]["name"],
            Extract<Fields[number], { type: "string" }>["name"]
          >
        : Fields[K];
    };
  },
): CollectionCreate<Fields, Name, DefaultSort> {
  return schema as CollectionCreate<Fields, Name, DefaultSort>;
}

type HasParentObject<
  T extends CollectionField[],
  Path extends string,
> = Path extends `${infer First}.${infer _Rest}`
  ? Extract<T[number], { name: First; type: "object" }> extends never
    ? false
    : true
  : true;

/**
 * A type that infers the native type of a field schema.
 * @template T The collection's fields.
 * @template Prefix The prefix used for nested objects.
 */
type InferNativeType<
  T extends CollectionField<string, string>[],
  Prefix extends string = "",
> = {
  [K in T[number]["name"] as K extends `${Prefix}${infer Key}`
    ? HasParentObject<T, K> extends true
      ? Key extends `${infer Parent}.${string}`
        ? Parent
        : Key
      : Key
    : never]: K extends `${Prefix}${infer Key}`
    ? HasParentObject<T, K> extends true
      ? Key extends `${infer Parent}.${string}`
        ? InferNativeType<T, `${Prefix}${Parent}.`>
        : T[number] extends { name: K; type: "object" }
          ? T[number]["name"] extends `${K}.${string}`
            ? InferNativeType<T, `${K}.`>
            : Record<string, unknown>
          : InferNativeTypeForField<Extract<T[number], { name: K }>>
      : InferNativeTypeForField<Extract<T[number], { name: K }>>
    : never;
};

/**
 * A type that checks if a field is referenced by another field in a foreign collection.
 * @template CurrentCollection The name of the current collection.
 * @template CurrentField The name of the current field.
 */
type IsFieldReferenced<
  CurrentCollection extends string,
  CurrentField extends string,
> = {
  [CollectionName in keyof GlobalCollections]: {
    [FieldName in keyof GlobalCollections[CollectionName]["fields"]]: GlobalCollections[CollectionName]["fields"][FieldName] extends {
      reference: `${CurrentCollection}.${CurrentField}`;
    }
      ? CollectionName
      : never;
  }[keyof GlobalCollections[CollectionName]["fields"]];
}[keyof GlobalCollections];

/**
 * A type that checks if a collection has fields that are referenced by another collection.
 * @template Name The name of the current collection.
 * @template Fields The schema of the current collection as an array of CollectionField.
 */
type HasReferencedFields<
  Name extends string,
  Fields extends readonly CollectionField[],
> = {
  [K in keyof Fields]: IsFieldReferenced<
    Name,
    Fields[K]["name"]
  >;
}[number] extends false
  ? never
  : IsFieldReferenced<Name, Fields[number]["name"]>;

/**
 * A type that returns all the collections that have fields that are referenced by another collection.
 */
type CheckReferences = {
  [CollectionName in keyof GlobalCollections]: HasReferencedFields<
    CollectionName & string,
    GlobalCollections[CollectionName]["fields"]
  >;
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GlobalCollections {}

export type {
  CheckReferences,
  CollectionCreate,
  CollectionField,
  DocumentSchema,
  EnforceKeyAndNameMatch,
  DeleteOptions,
  FacetableFieldKeys,
  FieldType,
  GlobalCollections,
  InferNativeType,
  InfixableFieldKeys,
  SortableFields,
  CreateOptions,
  Collection,
  CounterFields,
};

export { collection };
