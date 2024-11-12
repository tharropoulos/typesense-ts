import type { CollectionField } from "@/collection/base";

/**
 * A type that represents a field schema that should be dropped from a collection.
 * @template T The name of the field.
 */
interface DropField<T extends string = string> {
  name: T;
  drop: true;
}

/**
 * A type that represents a field schema for a collection that should be updated.
 * @template T The name of the field.
 * @template K The name of the fields to embed from.
 */
type CollectionUpdateField<
  T extends string = string,
  K extends string = string,
> = CollectionField<T, K> | DropField<T>;

interface CollectionUpdate<
  Fields extends CollectionUpdateField<string, string>[],
> {
  fields: Fields;
}

type NonDropFieldNames<T extends CollectionUpdateField<string, string>[]> =
  T[number] extends infer F ?
    F extends { drop: true } ? never
    : F extends { name: infer N } ? N
    : never
  : never;

type DropFieldNames<T extends CollectionUpdateField<string, string>[]> =
  T[number] extends infer F ?
    F extends DropField<string> ?
      F["name"]
    : never
  : never;

type FieldNames<T extends { name: string }[]> = T[number]["name"];

type DropFields<
  Original extends CollectionField<string, string>[],
  Update extends CollectionUpdateField<string, string>[],
> =
  Original extends (
    [infer Head, ...infer Tail extends CollectionField<string, string>[]]
  ) ?
    Head extends { name: infer Name } ?
      Name extends DropFieldNames<Update> ?
        DropFields<Tail, Update>
      : [Head, ...DropFields<Tail, Update>]
    : never
  : [];

type FitlerOutDropFields<T extends CollectionUpdateField<string, string>[]> =
  T extends (
    [infer Head, ...infer Tail extends CollectionUpdateField<string, string>[]]
  ) ?
    Head extends DropField<string> ?
      FitlerOutDropFields<Tail>
    : [Head, ...FitlerOutDropFields<Tail>]
  : [];

type UpdateTuple<
  Create extends CollectionField<string, string>[],
  Update extends CollectionUpdateField<string, string>[],
> = [...DropFields<Create, Update>, ...FitlerOutDropFields<Update>];

// Updated MergeCollectionSchemas
type MergeCollectionSchemas<
  Create extends { fields: CollectionField<string, string>[]; name: string } = {
    fields: CollectionField<string, string>[];
    name: string;
  },
  Update extends CollectionUpdate<CollectionUpdateField<string, string>[]> = {
    fields: CollectionUpdateField<string, string>[];
  },
> =
  Create["fields"] extends CollectionField<string, string>[] ?
    Create extends { fields: CollectionField<string, string>[] } ?
      ValidateUpdateFields<Create, Update> extends Update ?
        Omit<Create, "fields"> & {
          fields: UpdateTuple<Create["fields"], Update["fields"]>;
        }
      : ValidateUpdateFields<Create, Update>
    : never
  : never;

function validateCollectionUpdate<
  const Create extends {
    fields: CollectionField<string, string>[];
    name: string;
  },
  const Update extends CollectionUpdate<
    CollectionUpdateField<string, string>[]
  >,
  Valid = ValidateUpdateFields<Create, Update>,
>(
  create: Create,
  update: Update &
    (Valid extends Update ? unknown
    : [ValidateUpdateFields<Create, Update>] extends [string] ?
      ValidateUpdateFields<Create, Update>
    : never),
): MergeCollectionSchemas<Create, Update> {
  return {
    ...create,
    fields: update.fields,
  } as MergeCollectionSchemas<Create, Update>;
}

type ValidateUpdateFields<
  Create extends { fields: CollectionField<string, string>[] },
  Update extends CollectionUpdate<CollectionUpdateField<string, string>[]>,
> =
  DropFieldNames<Update["fields"]> extends Create["fields"][number]["name"] ?
    Exclude<
      NonDropFieldNames<Update["fields"]>,
      DropFieldNames<Update["fields"]>
    > extends (
      Exclude<FieldNames<Update["fields"]>, Create["fields"][number]["name"]>
    ) ?
      ValidateUpdate<Update>
    : "Fields in the update schema already exist in the original schema."
  : "Dropped fields in the update schema don't exist in the original schema.";

type ValidateUpdate<
  Update extends CollectionUpdate<CollectionUpdateField<string, string>[]>,
> =
  ExtractParents<Update["fields"]> extends infer Parents ?
    Parents extends (
      Record<string, { dropped: boolean; reinstantiated: unknown }>
    ) ?
      ValidateFields<Update["fields"], Parents> extends true ?
        Update
      : ValidateFields<Update["fields"], Parents>
    : never
  : never;

type ValidateFields<
  Fields extends CollectionUpdateField<string, string>[],
  Parents extends Record<string, { dropped: boolean; reinstantiated: unknown }>,
> =
  Fields extends [infer First, ...infer Rest] ?
    First extends CollectionUpdateField<string, string> ?
      ValidateField<First, Parents> extends true ?
        ValidateFields<
          Rest extends CollectionUpdateField<string, string>[] ? Rest : [],
          Parents
        >
      : ValidateField<First, Parents>
    : true
  : true;

type ValidateField<
  Field extends CollectionUpdateField<string, string>,
  Parents extends Record<string, { dropped: boolean; reinstantiated: unknown }>,
> =
  Field extends { name: string } ?
    // Get the parent name or the field name if it's not nested
    GetParent<Field["name"]> extends infer ParentName ?
      ParentName extends keyof Parents ?
        Parents[ParentName]["dropped"] extends true ?
          Parents[ParentName]["reinstantiated"] extends "object" ?
            true
          : `Field ${Field["name"]} is nested under a field that was dropped.`
        : Parents[ParentName]["reinstantiated"] extends "object" ?
          `Field ${Field["name"]} is nested under a field that was updated without being dropped.`
        : true
      : true
    : never
  : never;

type GetParent<T extends string> =
  T extends `${infer Parent}.${string}` ? Parent : never;

type ExtractParents<Fields extends CollectionUpdateField<string, string>[]> = {
  [K in Fields[number]["name"] as K extends GetParent<Fields[number]["name"]> ?
    K
  : never]: {
    dropped: Extract<Fields[number], { name: K; drop: true }> extends never ?
      false
    : true;
    reinstantiated: Extract<Fields[number], { name: K; type: string }> extends (
      {
        type: infer T;
      }
    ) ?
      T
    : false;
  };
};

export { validateCollectionUpdate };
export type { MergeCollectionSchemas };
