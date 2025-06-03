import type { DocumentSchema, InferNativeType } from "@/collection/base";

import { validateCollectionUpdate } from "@/collection/update";
import { setDefaultConfiguration } from "@/config";
import { collection, retrieveAllCollections } from "@/http/fetch";
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
  setDefaultConfiguration({
    apiKey: "xyz",
    nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
  });

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

const testSchema = collection({
  fields: [
    {
      name: "field",
      type: "string",
    },
  ],
  name: "retrieve-test",
});

declare module "@/collection/base" {
  interface GlobalCollections {
    test: typeof testSchema.schema;
  }
}
describe("collection tests", () => {
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
      await expect(schema.create()).rejects.toThrow(
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
      await expect(schema.create()).rejects.toThrow(
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
      await expect(schema.create()).rejects.toThrow(
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
      const result = await schema.create();

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
      const result = await schema.create();

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
      const schema = collection(
        // @ts-expect-error This is erroring as expected
        {
          name: "test",
          fields: [
            {
              type: "object",
              name: "field",
            },
          ],
        },
      );
      await expect(schema.create()).rejects.toThrow(
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
    });
    it("can have a nested object field with nested fields enabled", () => {
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
      const result = await schema.create();

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
      await expect(schema.create()).rejects.toThrow(
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
      const result = await schema.create();

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
      const result = await schema.create();

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
      const result = await schema.create();

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
      const result = await schema.create();

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
      // The request will go on through Typesense, but it will not add the parameters to the schema
    });
  });
  describe("retrieveCollection", () => {
    beforeAll(async () => {
      const collection = await fetch("http://localhost:8108/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-TYPESENSE-API-KEY": "xyz",
        },
        body: JSON.stringify(testSchema.schema),
      });
      expect(collection.ok).toBe(true);
    });
    afterAll(async () => {
      await fetch("http://localhost:8108/collections/retrieve-test", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-TYPESENSE-API-KEY": "xyz",
        },
      });
    });

    it("throws an error if the collection doesn't exist", async () => {
      const schema = collection({
        name: "non-existent",
        fields: [{ type: "string", name: "field" }],
      });
      await expect(schema.retrieve()).rejects.toThrow("Not Found");
    });
    it("can retrieve all collections", async () => {
      const result = await retrieveAllCollections();

      expect(result.length).toBeGreaterThanOrEqual(1);
      const retrievedCollection = result.find(
        (c) => c.name === "retrieve-test",
      );
      expect(retrievedCollection).toMatchObject({
        name: "retrieve-test",
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
        ],
        default_sorting_field: "",
        enable_nested_fields: false,
        symbols_to_index: [],
        token_separators: [],
      });
    });
    it("can retrieve a single collection", async () => {
      const result = await testSchema.retrieve();

      const { created_at, ...expectedResult } = result;

      expect(created_at).toBeCloseTo(Date.now() / 1000, -3);
      expect(expectedResult).toMatchObject({
        name: "retrieve-test",
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
        ],
        default_sorting_field: "",
        enable_nested_fields: false,
        symbols_to_index: [],
        token_separators: [],
      });
    });
  });
  describe("deleteCollection", () => {
    beforeAll(async () => {
      const collection = await fetch("http://localhost:8108/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-TYPESENSE-API-KEY": "xyz",
        },
        body: JSON.stringify(testSchema.schema),
      });
      expect(collection.ok).toBe(true);
    });
    it("can delete a collection", async () => {
      const result = await fetch(
        "http://localhost:8108/collections/retrieve-test",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-TYPESENSE-API-KEY": "xyz",
          },
        },
      );

      expect(result.ok).toBe(true);
    });
    it("can't delete a non-existent collection", async () => {
      const result = await fetch(
        "http://localhost:8108/collections/non-existent",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-TYPESENSE-API-KEY": "xyz",
          },
        },
      );

      expect(result.ok).toBe(false);
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
      await expect(schema.create()).resolves.toBeTruthy();

      const updatedSchema = validateCollectionUpdate(
        schema.schema,
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
      await expect(schema.update(updatedSchema)).rejects.toThrow(
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
      await expect(schema.create()).resolves.toBeTruthy();

      const updatedSchema = validateCollectionUpdate(
        schema.schema,
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
      await expect(schema.update(updatedSchema)).rejects.toThrow(
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
      await expect(schema.create()).resolves.toBeTruthy();

      const updatedSchema = validateCollectionUpdate(schema.schema, {
        fields: [
          {
            name: "field",
            drop: true,
          },
        ],
      });
      const result = await schema.update(updatedSchema);

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
      await expect(schema.create()).resolves.toBeTruthy();

      const updatedSchema = validateCollectionUpdate(schema.schema, {
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
      const result = await schema.update(updatedSchema);

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
      await expect(schema.create()).resolves.toBeTruthy();

      const updatedSchema = validateCollectionUpdate(schema.schema, {
        fields: [
          {
            name: "field2",
            type: "string",
          },
        ],
      });
      const result = await schema.update(updatedSchema);

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
      await expect(schema.create()).resolves.toBeTruthy();

      //TODO: This should be an error, but it's not being caught
      const updatedSchema = validateCollectionUpdate(schema.schema, {
        fields: [
          {
            name: "field2",
            type: "object",
          },
        ],
      });
      await expect(schema.update(updatedSchema)).rejects.toThrow(
        "Type `object` or `object[]` can be used only when nested fields are enabled by setting` enable_nested_fields` to true.",
      );
    });
  });
  describe("document operations", () => {
    describe("create", () => {
      it("can create a single document", async () => {
        const schema = collection({
          name: "test",
          fields: [
            {
              type: "string",
              name: "title",
            },
            {
              type: "string",
              name: "content",
            },
          ],
        });

        await schema.create();

        const result = await schema.documents.create({
          title: "Test Title",
          content: "Test Content",
        });

        expect(result).toMatchObject({
          title: "Test Title",
          content: "Test Content",
        });
        await schema.delete();
      });

      it("can create a document with optional fields", async () => {
        const schema = collection({
          name: "test",
          fields: [
            {
              type: "string",
              name: "title",
            },
            {
              type: "int32",
              name: "rating",
              optional: true,
            },
          ],
        });

        await schema.create();

        const result = await schema.documents.create({
          title: "Test Title",
          rating: 5,
        });

        expect(result).toMatchObject({
          title: "Test Title",
          rating: 5,
        });
        await schema.delete();
      });

      it("can create a document with custom id", async () => {
        const schema = collection({
          name: "test",
          fields: [
            {
              type: "string",
              name: "title",
            },
          ],
        });

        await schema.create();

        const result = await schema.documents.create(
          {
            id: "custom-id",
            title: "Test Title",
          },
          { return_id: true },
        );

        expect(result.id).toBe("custom-id");
        await schema.delete();
      });
    });

    describe("import", () => {
      it("can import multiple documents successfully", async () => {
        const schema = collection({
          name: "test",
          fields: [
            {
              type: "string",
              name: "title",
            },
            {
              type: "string",
              name: "content",
            },
          ],
        });

        await schema.create();

        const result = await schema.documents.import(
          [
            { title: "Document 1", content: "Content 1" },
            { title: "Document 2", content: "Content 2" },
            { title: "Document 3", content: "Content 3" },
          ],
          {
            return_doc: true,
          },
        );

        expect(result).toHaveLength(3);
        result.forEach((doc) => {
          expect(doc.success).toBe(true);
        });
        expect(result[0]?.document).toMatchObject({
          title: "Document 1",
          id: "0",
          content: "Content 1",
        });
        await schema.delete();
      });

      it("can import documents with parameters", async () => {
        const schema = collection({
          name: "test",
          fields: [
            {
              type: "string",
              name: "title",
            },
          ],
        });

        await schema.create();

        const documents = [
          { id: "doc1", title: "Document 1" },
          { id: "doc2", title: "Document 2" },
        ] as const;

        const result = await schema.documents.import(
          [
            { id: "doc1", title: "Document 1" },
            { id: "doc2", title: "Document 2" },
          ],
          {
            return_doc: true,
            return_id: true,
          },
        );

        expect(result).toHaveLength(2);
        result.forEach((doc, index) => {
          expect(doc.success).toBe(true);
          expect(doc.document.id).toBe(documents[index]!.id);
        });
        await schema.delete();
      });

      it("throws DocumentImportError when documents fail to import", async () => {
        const schema = collection({
          name: "test",
          fields: [
            {
              type: "string",
              name: "title",
            },
            {
              type: "int32",
              name: "rating",
            },
          ],
        });

        await schema.create();

        const documents = [
          { title: "Valid Document", rating: 5 },
          { title: "Invalid Document", rating: "not a number" as unknown },
          { title: "Another Valid", rating: 3 },
        ];

        await expect(
          // @ts-expect-error - Invalid document has a rating of unknown
          schema.documents.import(documents, undefined, {
            throw_on_failure: true,
          }),
        ).rejects.toThrow();

        try {
          // @ts-expect-error - Invalid document has a rating of unknown
          await schema.documents.import(documents, undefined);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          if (
            error instanceof Error &&
            "name" in error &&
            "failedDocuments" in error
          ) {
            expect(error.name).toBe("DocumentImportError");
            expect(error.failedDocuments).toBeDefined();
            expect(Array.isArray(error.failedDocuments)).toBe(true);
          }
        }
        await schema.delete();
      });

      it("returns mixed results without throwing when throw_on_failure is false", async () => {
        const schema = collection({
          name: "test",
          fields: [
            {
              type: "string",
              name: "title",
            },
            {
              type: "int32",
              name: "rating",
            },
          ],
        });

        await schema.create();

        const documents = [
          { title: "Valid Document", rating: 5 },
          { title: "Invalid Document", rating: "not a number" as unknown },
        ];

        // @ts-expect-error - Invalid document has a rating of unknown
        const result = await schema.documents.import(documents, undefined, {
          throw_on_failure: false,
        });

        expect(result).toHaveLength(2);
        expect(result.some((r) => r.success === true)).toBe(true);
        expect(result.some((r) => r.success === false)).toBe(true);
        await schema.delete();
      });

      it("can import empty array", async () => {
        const schema = collection({
          name: "test",
          fields: [
            {
              type: "string",
              name: "title",
            },
          ],
        });

        await schema.create();

        await expect(schema.documents.import([])).rejects.toThrow(
          "Cannot import empty array",
        );

        await schema.delete();
      });

      it("can import documents with nested fields", async () => {
        const schema = collection({
          name: "test",
          fields: [
            {
              type: "string",
              name: "title",
            },
            {
              type: "object",
              name: "metadata",
            },
            {
              type: "string",
              name: "metadata.author",
            },
            {
              type: "int32",
              name: "metadata.year",
            },
          ],
          enable_nested_fields: true,
        });

        await schema.create();

        const documents = [
          {
            title: "Book 1",
            metadata: {
              author: "Author 1",
              year: 2021,
            },
          },
          {
            title: "Book 2",
            metadata: {
              author: "Author 2",
              year: 2022,
            },
          },
        ];

        const result = await schema.documents.import(documents);

        expect(result).toHaveLength(2);
        result.forEach((doc) => {
          expect(doc.success).toBe(true);
        });
        await schema.delete();
      });

      it("handles large batch imports", async () => {
        const schema = collection({
          name: "large_batch_import",
          fields: [
            {
              type: "string",
              name: "title",
            },
            {
              type: "int32",
              name: "index",
            },
          ],
        });

        await schema.create();

        const documents = Array.from({ length: 100 }, (_, i) => ({
          title: `Document ${i}`,
          index: i,
        }));

        const result = await schema.documents.import(documents);

        expect(result).toHaveLength(100);
        result.forEach((doc) => {
          expect(doc.success).toBe(true);
        });
        await schema.delete();
      });
    });
    describe("update", () => {
      it("can update a document via documentId", async () => {
        const schema = collection({
          name: "test",
          fields: [
            {
              type: "string",
              name: "title",
            },
          ],
        });

        await schema.create();

        const createdDoc = await schema.documents.create({
          title: "Test Title",
        });

        const result = await schema.documents.update(
          {
            title: "Updated Title",
          },
          {
            documentId: createdDoc.id,
          },
        );

        expect(result.title).toBe("Updated Title");
        expect(result.id).toBe(createdDoc.id);

        await schema.delete();
      });

      it("can update a document via filter_by", async () => {
        const schema = collection({
          name: "test",
          fields: [
            {
              type: "string",
              name: "title",
            },
            {
              type: "int32",
              name: "num",
            },
          ],
        });

        await schema.create();

        await schema.documents.import([
          {
            title: "Test Title",
            num: 1,
          },
          {
            title: "Test Title 2",
            num: 2,
          },
          {
            title: "Test Title 3",
            num: 3,
          },
        ]);

        const result = await schema.documents.update(
          {
            title: "Updated Title",
          },
          {
            parameters: {
              filter_by: `num:<3`,
            },
          },
        );

        expect(result.num_updated).toBe(2);
        await schema.delete();
      });
    });
    describe("retrieve", () => {
      it("can retrieve a document via documentId", async () => {
        const schema = collection({
          name: "test",
          fields: [
            {
              type: "string",
              name: "title",
            },
          ],
        });

        await schema.create();

        const createdDoc = await schema.documents.create({
          title: "Test Title",
        });

        const retrievedDoc = await schema.documents.retrieve(createdDoc.id);

        expect(retrievedDoc.title).toBe("Test Title");
        expect(retrievedDoc.id).toBe(createdDoc.id);
        await schema.delete();
      });
    });
    describe("delete", () => {
      it("can delete a document by query", async () => {
        const schema = collection({
          name: "test",
          fields: [
            {
              type: "string",
              name: "title",
            },
          ],
        });

        await schema.create();

        await schema.documents.import([
          {
            title: "Test Title",
            id: "1",
          },
          {
            title: "Test Title 2",
            id: "2",
          },
          {
            title: "Test Title 3",
            id: "3",
          },
        ]);

        const retrievedDoc = await schema.retrieve();

        expect(retrievedDoc.num_documents).toBe(3);

        const result = await schema.documents.delete({
          parameters: {
            filter_by: `id:1 || id:2`,
          },
        });

        expect(result.num_deleted).toBe(2);

        const retrievedDoc2 = await schema.retrieve();

        expect(retrievedDoc2.num_documents).toBe(1);

        await schema.delete();
      });
      it("can delete a document via documentId", async () => {
        const schema = collection({
          name: "test",
          fields: [
            {
              type: "string",
              name: "title",
            },
          ],
        });

        await schema.create();

        await schema.documents.create({
          title: "Test Title",
          id: "1",
        });

        const retrievedDoc = await schema.retrieve();

        expect(retrievedDoc.num_documents).toBe(1);

        const result = await schema.documents.delete({
          documentId: "1",
        });

        expect(result.title).toBe("Test Title");
        expect(result.id).toBe("1");

        const retrievedDoc2 = await schema.retrieve();

        expect(retrievedDoc2.num_documents).toBe(0);

        await schema.delete();
      });
      it("can truncate a collection", async () => {
        const schema = collection({
          name: "test",
          fields: [
            {
              type: "string",
              name: "title",
            },
          ],
        });

        await schema.create();

        await schema.documents.create({
          title: "Test Title",
        });

        const retrievedDoc = await schema.retrieve();

        expect(retrievedDoc.num_documents).toBe(1);

        //TODO:
        // This is going to fail on 27.1
        // const result = await schema.documents.delete({
        //   parameters: { truncate: true },
        // });

        // expect(result.num_deleted).toBe(1);

        // const retrievedDoc2 = await schema.retrieve();

        // expect(retrievedDoc2.num_documents).toBe(0);

        // await schema.delete();
      });
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
        field: string;
        id: string;
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
        field: string[];
        id: string;
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
        field: number;
        id: string;
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
        field: number[];
        id: string;
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
        field: number;
        id: string;
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
        field: number[];
        id: string;
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
        field: number;
        id: string;
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
        field: number[];
        id: string;
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
        field: boolean;
        id: string;
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
        field: boolean[];
        id: string;
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
        field: [number, number];
        id: string;
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
        field: [number, number][];
        id: string;
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
        field: unknown;
        id: string;
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
        field: string;
        id: string;
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
        field: string;
        id: string;
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
        field: string | undefined;
        id: string;
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
        field: DocumentSchema;
        id: string;
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
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

      expectTypeOf<
        InferNativeType<typeof _schema.schema.fields>
      >().toMatchTypeOf<{
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
