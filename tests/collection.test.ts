import type { InferNativeType } from "@/collection/base";

import { collection } from "@/collection/base";
import { validateCollectionUpdate } from "@/collection/update";
import { configure } from "@/config";
import {
  createCollection,
  updateCollection,
} from "@/http/fetch/collection";
import { upAll } from "docker-compose";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  expectTypeOf,
  it,
} from "vitest";

const isCi = process.env.CI;

beforeAll(async () => {
  if (!isCi) {
    await upAll({ cwd: __dirname, log: true });
  }
});

afterEach(async () => {
  await fetch("http://localhost:8108/collections/test", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
  });
});

describe("collection tests", () => {
  const config = configure({
    apiKey: "xyz",
    nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
  });
  describe("createCollection", () => {
    it("can't have an optional default sorting field", async () => {
      const schema = collection({
        name: "test",
        fields: [
          {
            type: "string",
            optional: true,
            sort: true,
            name: "field",
          },
        ],
        // @ts-expect-error This is erroring as expected
        default_sorting_field: "field",
      });
      await expect(createCollection(schema, config)).rejects.toThrow(
        "Default sorting field `field` cannot be an optional field",
      );
    });
    it("can't have a string that's not sorted as a default sorting field", async () => {
      const schema = collection({
        name: "test",
        fields: [
          {
            type: "string",
            name: "field",
          },
        ],
        // @ts-expect-error This is erroring as expected
        default_sorting_field: "field",
      });
      await expect(createCollection(schema, config)).rejects.toThrow(
        "Default sorting field `field` is not a sortable type",
      );
    });
    it("can't have a num field as a default sorting field", async () => {
      const schema = collection({
        name: "test",
        fields: [
          {
            type: "int32",
            sort: false,
            name: "field",
          },
        ],
        // @ts-expect-error This is erroring as expected
        default_sorting_field: "field",
      });
      await expect(createCollection(schema, config)).rejects.toThrow(
        "Default sorting field `field` is not a sortable type",
      );
    });
    it("can have a num field as a default sorting field", async () => {
      const schema = collection({
        name: "test",
        fields: [
          {
            type: "int32",
            name: "field",
          },
        ],
        default_sorting_field: "field",
      });
      const result = await createCollection(schema, config);

      const { created_at, ...expectedResult } = result;

      expect(created_at).toBeCloseTo(Date.now() / 1000, -3);
      expect(expectedResult).toStrictEqual({
        name: "test",
        num_documents: 0,
        fields: [
          {
            name: "field",
            type: "int32",
            facet: false,
            index: true,
            locale: "",
            infix: false,
            optional: false,
            sort: true,
            stem: false,
            store: true,
          },
        ],
        default_sorting_field: "field",
        enable_nested_fields: false,
        symbols_to_index: [],
        token_separators: [],
      });
    });
    it("can have a string field that's sorted as a default sorting field", async () => {
      const schema = collection({
        name: "test",
        fields: [
          {
            type: "string",
            sort: true,
            name: "field",
          },
        ],
        default_sorting_field: "field",
      });
      const result = await createCollection(schema, config);

      const { created_at, ...expectedResult } = result;

      expect(created_at).toBeCloseTo(Date.now() / 1000, -3);
      expect(expectedResult).toStrictEqual({
        name: "test",
        num_documents: 0,
        fields: [
          {
            name: "field",
            type: "string",
            facet: false,
            index: true,
            locale: "",
            infix: false,
            optional: false,
            sort: true,
            stem: false,
            store: true,
          },
        ],
        default_sorting_field: "field",
        enable_nested_fields: false,
        symbols_to_index: [],
        token_separators: [],
      });
    });
    it("can't have a nested object field without nested fields enabled", async () => {
      await expect(
        createCollection(
          // @ts-expect-error This is erroring as expected
          collection({
            name: "test",
            fields: [
              {
                type: "object",
                name: "field",
              },
            ],
          }),
          config,
        ),
      ).rejects.toThrow(
        "Type `object` or `object[]` can be used only when nested fields are enabled by setting` enable_nested_fields` to true.",
      );

      await expect(
        createCollection(
          collection({
            name: "test",
            fields: [
              {
                type: "object",
                name: "field",
              },
            ],
            // @ts-expect-error This is erroring as expected
            enable_nested_fields: false,
          }),
          config,
        ),
      ).rejects.toThrow(
        "Type `object` or `object[]` can be used only when nested fields are enabled by setting` enable_nested_fields` to true.",
      );
    });
    it("can't have num_dim, vec_dist or hnsw_params on a non-floating point field", () => {
      collection({
        name: "test",
        fields: [
          {
            type: "string",
            name: "field",
            // @ts-expect-error This is erroring as expected
            vec_dist: "cosine",
          },
        ],
      });
      collection({
        name: "test",
        fields: [
          // @ts-expect-error This is erroring as expected
          {
            type: "string",
            name: "field",
            num_dim: 384,
          },
        ],
      });
      collection({
        name: "test",
        fields: [
          // @ts-expect-error This is erroring as expected
          {
            type: "string",
            name: "field",
            hnsw_params: {
              M: 16,
              ef_construction: 200,
            },
          },
        ],
      });
      //The request will go on through Typesense, but it will not add the parameters to the schema
    });
    it("can have a nested object field with nested fields enabled", async () => {
      const schema = collection({
        name: "test",
        fields: [
          {
            type: "object",
            name: "field",
          },
        ],
        enable_nested_fields: true,
      });
      const result = await createCollection(schema, config);

      const { created_at, ...expectedResult } = result;

      expect(created_at).toBeCloseTo(Date.now() / 1000, -3);
      expect(expectedResult).toStrictEqual({
        name: "test",
        num_documents: 0,
        fields: [
          {
            name: "field",
            type: "object",
            facet: false,
            index: true,
            locale: "",
            infix: false,
            optional: false,
            sort: false,
            stem: false,
            store: true,
          },
        ],
        default_sorting_field: "",
        enable_nested_fields: true,
        symbols_to_index: [],
        token_separators: [],
      });
    });
    it("can't have a non-indexed-field facetted by", async () => {
      const schema = collection({
        name: "test",
        fields: [
          // @ts-expect-error This is erroring as expected
          { type: "string", name: "field", index: false, facet: true },
        ],
      });
      await expect(createCollection(schema, config)).rejects.toThrow(
        "Field `field` cannot be a facet since it's marked as non-indexable.",
      );
    });
    it("can have a non-index field sorted by", async () => {
      const schema = collection({
        name: "test",
        fields: [
          {
            type: "string",
            name: "field",
            index: false,
            sort: true,
          },
        ],
      });
      const result = await createCollection(schema, config);

      const { created_at, ...expectedResult } = result;

      expect(created_at).toBeCloseTo(Date.now() / 1000, -3);
      expect(expectedResult).toStrictEqual({
        name: "test",
        num_documents: 0,
        fields: [
          {
            name: "field",
            type: "string",
            facet: false,
            index: false,
            locale: "",
            infix: false,
            optional: false,
            sort: true,
            stem: false,
            store: true,
          },
        ],
        default_sorting_field: "",
        enable_nested_fields: false,
        symbols_to_index: [],
        token_separators: [],
      });
    });
    it("can have a facet set to true if the index is undefined or true", async () => {
      const schema = collection({
        name: "test",
        fields: [
          {
            type: "string",
            name: "field",
            index: true,
            facet: true,
          },
          {
            type: "string",
            name: "field2",
            facet: true,
          },
        ],
      });
      const result = await createCollection(schema, config);

      const { created_at, ...expectedResult } = result;

      expect(created_at).toBeCloseTo(Date.now() / 1000, -3);
      expect(expectedResult).toStrictEqual({
        name: "test",
        num_documents: 0,
        fields: [
          {
            name: "field",
            type: "string",
            facet: true,
            index: true,
            locale: "",
            infix: false,
            optional: false,
            sort: false,
            stem: false,
            store: true,
          },
          {
            name: "field2",
            type: "string",
            facet: true,
            index: true,
            locale: "",
            infix: false,
            optional: false,
            sort: false,
            stem: false,
            store: true,
          },
        ],
        default_sorting_field: "",
        enable_nested_fields: false,
        symbols_to_index: [],
        token_separators: [],
      });
    });
    it("can have a sort set to true if the index is undefined or true", async () => {
      const schema = collection({
        name: "test",
        fields: [
          {
            type: "string",
            name: "field",
            index: true,
            sort: true,
          },
          {
            type: "string",
            name: "field2",
            sort: true,
          },
        ],
      });
      const result = await createCollection(schema, config);

      const { created_at, ...expectedResult } = result;

      expect(created_at).toBeCloseTo(Date.now() / 1000, -3);
      expect(expectedResult).toStrictEqual({
        name: "test",
        num_documents: 0,
        fields: [
          {
            name: "field",
            type: "string",
            facet: false,
            index: true,
            locale: "",
            infix: false,
            optional: false,
            sort: true,
            stem: false,
            store: true,
          },
          {
            name: "field2",
            type: "string",
            facet: false,
            index: true,
            locale: "",
            infix: false,
            optional: false,
            sort: true,
            stem: false,
            store: true,
          },
        ],
        default_sorting_field: "",
        enable_nested_fields: false,
        symbols_to_index: [],
        token_separators: [],
      });
    });
    it("can have an embedding field", { timeout: 30000 }, async () => {
      const schema = collection({
        name: "test",
        fields: [
          {
            type: "string",
            name: "field",
          },
          { type: "string", name: "field2" },
          {
            name: "field3",
            type: "float[]",
            embed: {
              from: ["field"],
              model_config: {
                model_name: "ts/e5-small",
              },
            },
          },
        ],
      });
      const result = await createCollection(schema, config);

      const { created_at, ...expectedResult } = result;

      expect(created_at).toBeCloseTo(Date.now() / 1000, -3);
      expect(expectedResult).toStrictEqual({
        name: "test",
        num_documents: 0,
        fields: [
          {
            name: "field",
            type: "string",
            facet: false,
            index: true,
            locale: "",
            infix: false,
            optional: false,
            sort: false,
            stem: false,
            store: true,
          },
          {
            name: "field2",
            type: "string",
            facet: false,
            index: true,
            locale: "",
            infix: false,
            optional: false,
            sort: false,
            stem: false,
            store: true,
          },
          {
            name: "field3",
            type: "float[]",
            facet: false,
            index: true,
            locale: "",
            infix: false,
            optional: false,
            sort: false,
            stem: false,
            store: true,
            embed: {
              from: ["field"],
              model_config: {
                model_name: "ts/e5-small",
              },
            },
            hnsw_params: {
              M: 16,
              ef_construction: 200,
            },
            vec_dist: "cosine",
            num_dim: 384,
          },
        ],
        default_sorting_field: "",
        enable_nested_fields: false,
        symbols_to_index: [],
        token_separators: [],
      });
    });
    it("can't have an embedding field with a type other than float[]", () => {
      collection({
        name: "test",
        fields: [
          {
            type: "string",
            name: "field",
          },
          // @ts-expect-error This is erroring as expected
          {
            name: "field2",
            type: "string[]",
            embed: {
              from: ["field"],
              model_config: {
                model_name: "ts/e5-small",
              },
            },
          },
        ],
      });
      // INFO: Non-float[] embeddings are not supported, but the schema is still created, this is a bug (fixed on upstream, but not on 27.1 )
      // await expect(create(schema, config)).rejects.toThrow(
      //   "Fields with the `embed` parameter can only be of type `float[]`.",
      // );
    });
  });
  describe("updateCollection", () => {
    it("can't change a field signature without dropping it first", async () => {
      const schema = collection({
        name: "test",
        fields: [
          {
            type: "string",
            name: "field",
          },
        ],
      });
      await expect(createCollection(schema, config)).resolves.toBeTruthy();

      const updatedSchema = validateCollectionUpdate(
        schema,
        // @ts-expect-error This is erroring as expected
        {
          fields: [
            {
              name: "field",
              type: "int32",
            },
          ],
        },
      );
      // @ts-expect-error This is erroring as expected
      await expect(updateCollection(updatedSchema, config)).rejects.toThrow(
        "Field `field` is already part of the schema: To change this field, drop it first before adding it back to the schema.",
      );
    });
    it("can't drop a field that doesn't exist", async () => {
      const schema = collection({
        name: "test",
        fields: [
          {
            type: "string",
            name: "field",
          },
        ],
      });
      await expect(createCollection(schema, config)).resolves.toBeTruthy();

      const updatedSchema = validateCollectionUpdate(
        schema,
        // @ts-expect-error This is erroring as expected
        {
          fields: [
            {
              name: "field2",
              drop: true,
            },
          ],
        },
      );
      // @ts-expect-error This is erroring as expected
      await expect(updateCollection(updatedSchema, config)).rejects.toThrow(
        "Field `field2` is not part of collection schema.",
      );
    });
    it("can drop a field", async () => {
      const schema = collection({
        name: "test",
        fields: [
          {
            type: "string",
            name: "field",
          },
        ],
        enable_nested_fields: true,
      });
      await expect(createCollection(schema, config)).resolves.toBeTruthy();

      const updatedSchema = validateCollectionUpdate(schema, {
        fields: [
          {
            name: "field",
            drop: true,
          },
        ],
      });
      const result = await updateCollection(updatedSchema, config);

      expect(result).toStrictEqual({
        fields: [{ name: "field", drop: true }],
      });
    });
    it("can reinstantiate a field", async () => {
      const schema = collection({
        name: "test",
        fields: [
          {
            type: "string",
            name: "field",
          },
        ],
        default_sorting_field: undefined,
      });
      await expect(createCollection(schema, config)).resolves.toBeTruthy();

      const updatedSchema = validateCollectionUpdate(schema, {
        fields: [
          {
            name: "field",
            drop: true,
          },
          {
            name: "field",
            type: "int32",
          },
        ],
      });
      const result = await updateCollection(updatedSchema, config);

      expect(result).toStrictEqual({
        fields: [
          {
            name: "field",
            drop: true,
          },
          {
            name: "field",
            type: "int32",
          },
        ],
      });
    });
    it("can add a new field", async () => {
      const schema = collection({
        name: "test",
        fields: [
          {
            type: "string",
            name: "field",
          },
        ],
      });
      await expect(createCollection(schema, config)).resolves.toBeTruthy();

      const updatedSchema = validateCollectionUpdate(schema, {
        fields: [
          {
            name: "field2",
            type: "string",
          },
        ],
      });
      const result = await updateCollection(updatedSchema, config);

      expect(result).toStrictEqual({
        fields: [
          {
            name: "field2",
            type: "string",
          },
        ],
      });
    });
    it("can't add an object field if nested fields are not enabled", async () => {
      const schema = collection({
        name: "test",
        fields: [
          {
            type: "string",
            name: "field",
          },
        ],
      });
      await expect(createCollection(schema, config)).resolves.toBeTruthy();

      //TODO: This should be an error, but it's not being caught
      const updatedSchema = validateCollectionUpdate(schema, {
        fields: [
          {
            name: "field2",
            type: "object",
          },
        ],
      });
      await expect(updateCollection(updatedSchema, config)).rejects.toThrow(
        "Type `object` or `object[]` can be used only when nested fields are enabled by setting` enable_nested_fields` to true.",
      );
    });
  });
  describe("InferNativeType tests", () => {
    it("can infer the native type of a string", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "string",
            name: "field",
          },
        ],
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: string;
      }>();
    });
    it("can infer the native type of a string array", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "string[]",
            name: "field",
          },
        ],
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: string[];
      }>();
    });
    it("can infer the native type of an int32", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "int32",
            name: "field",
          },
        ],
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: number;
      }>();
    });
    it("can infer the native type of a int32 array", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "int32[]",
            name: "field",
          },
        ],
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: number[];
      }>();
    });
    it("can infer the native type of an int64", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "int64",
            name: "field",
          },
        ],
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: number;
      }>();
    });
    it("can infer the native type of a int64 array", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "int64[]",
            name: "field",
          },
        ],
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: number[];
      }>();
    });
    it("can infer the native type of a float", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "float",
            name: "field",
          },
        ],
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: number;
      }>();
    });
    it("can infer the native type of a float array", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "float[]",
            name: "field",
          },
        ],
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: number[];
      }>();
    });
    it("can infer the native type of a boolean", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "bool",
            name: "field",
          },
        ],
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: boolean;
      }>();
    });
    it("can infer the native type of a boolean array", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "bool[]",
            name: "field",
          },
        ],
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: boolean[];
      }>();
    });
    it("can infer the native type of an geopoint", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "geopoint",
            name: "field",
          },
        ],
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: [number, number];
      }>();
    });
    it("can infer the native type of an geopoint array", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "geopoint[]",
            name: "field",
          },
        ],
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: [number, number][];
      }>();
    });
    it("can infer the native type of an auto", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "auto",
            name: "field",
          },
        ],
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: unknown;
      }>();
    });
    it("can infer the native type of a wildcard string", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "string*",
            name: "field",
          },
        ],
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: string;
      }>();
    });
    it("can infer the native type of a base64 encoded image", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "image",
            name: "field",
          },
        ],
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: string;
      }>();
    });
    it("can infer optional fields", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "string",
            optional: true,
            name: "field",
          },
        ],
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: string | undefined;
      }>();
    });
    it("can infer the native type of an object with no children keys", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "object",
            name: "field",
          },
        ],
        enable_nested_fields: true,
      });
      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: Record<string, unknown>;
      }>();
    });
    it("can infer the native type of an object with children keys", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "object",
            name: "field",
          },
          {
            type: "string",
            name: "field.child",
          },
          {
            type: "object",
            name: "field.child2",
          },
          {
            type: "string",
            name: "field.child2.child",
          },
        ],
        enable_nested_fields: true,
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: {
          child: string;
          child2: {
            child: string;
          };
        };
      }>();
    });
    it("can infer the native type of flattened object fields", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "object",
            name: "field",
            flattened: true,
          },
          {
            type: "string",
            name: "field.child",
          },
          {
            type: "string",
            name: "flattened.name",
          },
        ],
        enable_nested_fields: true,
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: {
          child: string;
        };
        "flattened.name": string;
      }>();
    });
    it("can infer the native type of an object with children keys and optional fields", () => {
      const _schema = collection({
        name: "test",
        fields: [
          {
            type: "object",
            name: "field",
          },
          {
            type: "string",
            name: "field.child",
          },
          {
            type: "object",
            name: "field.child2",
          },
          {
            type: "string",
            name: "field.child2.child",
            optional: true,
          },
        ],
        enable_nested_fields: true,
      });

      expectTypeOf<InferNativeType<typeof _schema.fields>>().toEqualTypeOf<{
        field: {
          child: string;
          child2: {
            child: string | undefined;
          };
        };
      }>();
    });
  });
});
