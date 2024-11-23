/**
 * Remove the `default_sorting_field` key from a record.
 * Useful for guarding types with a type of collection schema, for objects that may or may not have
 * a `default_sorting_field` key.
 * @template T - Any record that has a key of `default_sorting_field`.
 */
type OmitDefaultSortingField<T> = Omit<T, "default_sorting_field">;

/**
 * Useful for `type instantiation is excessively deep and possibly infinite` errors.
 * [Reference](https://x.com/solinvictvs/status/1671507561143476226)
 * @template T - The type to recurse.
 */
type Recurse<T> = T extends infer R ? R : never;

type ExcludeFromTuple<T extends unknown[], U extends unknown[]> =
  T extends [infer F, ...infer R] ?
    F extends U[number] ?
      ExcludeFromTuple<R, U>
    : [F, ...ExcludeFromTuple<R, U>]
  : [];

type IntersectTuples<T extends unknown[], U extends unknown[]> =
  T extends [infer F, ...infer R] ?
    F extends U[number] ?
      [F, ...IntersectTuples<R, U>]
    : IntersectTuples<R, U>
  : [];

type RemoveType<T extends readonly unknown[], E> =
  T extends [infer F, ...infer R] ?
    [F] extends [E] ?
      RemoveType<R, E>
    : [F, ...RemoveType<R, E>]
  : [];

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

type TupleIncludes<T extends readonly unknown[] | undefined, V> =
  T extends readonly [infer F, ...infer R] ?
    F extends V ?
      true
    : TupleIncludes<R, V>
  : false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type {
  OmitDefaultSortingField,
  Recurse,
  ExcludeFromTuple,
  IntersectTuples,
  RemoveType,
  TupleIncludes,
  DeepPartial,
};

export { sleep };
