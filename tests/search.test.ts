import type {
  GenerateNestedStructure,
  GetFieldsInDocumentFromParams,
  GetHighlightsFromParams,
  MapInfixValues,
  QueryBy,
} from "@/search";

import { collection } from "@/collection/base";
import { configure } from "@/config";
import { createCollection, search } from "@/http/fetch/collection";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  expectTypeOf,
  it,
} from "vitest";
import { upAll } from "docker-compose";

const isCi = process.env.CI;

const _search_schema = collection({
  fields: [
    { name: "foo", type: "string" },
    { name: "bar", type: "int32" },
    { name: "baz", type: "object" },
    { name: "baz.qux", type: "string", facet: true },
    { name: "quux", type: "string", infix: true },
    { name: "quuz", type: "string", index: false },
    { name: "ref", type: "string", reference: "test.name", optional: true },
  ],
  name: "search_test",
  enable_nested_fields: true,
});

const config = configure({
  apiKey: "xyz",
  nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
});

declare module "@/collection/base" {
  interface GlobalCollections {
    search: typeof _search_schema;
  }
}

beforeAll(async () => {
  if (!isCi) {
    await upAll({ cwd: __dirname, log: true });
  }
  await createCollection(_search_schema, config);
  const doc = await fetch(
    "http://localhost:8108/collections/search_test/documents",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-TYPESENSE-API-KEY": "xyz",
      },
      body: JSON.stringify({
        foo: "qu",
        bar: 1,
        baz: { qux: "qux" },
        quux: "quux",
        quuz: "quuz",
      }),
    },
  );
  expect(doc.ok).toBeTruthy();
});

afterAll(async () => {
  await fetch("http://localhost:8108/collections/search_test", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
  });
});

describe("search tests", () => {
  describe("type tests", () => {
    describe("MapInfixValues", () => {
      it("should return just 'off' if none of the values passed are infixable", () => {
        const _schema = collection({
          fields: [
            { type: "string", name: "name" },
            { type: "string", name: "username" },
          ],
          name: "users",
        });
        expectTypeOf<
          MapInfixValues<typeof _schema.fields, ["name", "username"]>
        >().toEqualTypeOf<["off", "off"]>();
      });
      it("should return mixed values if some of the values passed are infixable", () => {
        const _schema = collection({
          fields: [
            { type: "string", name: "name", infix: true },
            { type: "string", name: "username" },
          ],
          name: "users",
        });
        expectTypeOf<
          MapInfixValues<typeof _schema.fields, ["name", "username"]>
        >().toEqualTypeOf<["off" | "always" | "fallback", "off"]>();
      });
    });
    describe("QueryBy", () => {
      it("should return a never tuple if none of the fields are of type `string`", () => {
        const _schema = collection({
          fields: [
            { type: "int32", name: "foo" },
            { type: "bool", name: "bar" },
          ],
          name: "users",
        });
        expectTypeOf<QueryBy<typeof _schema.fields>>().toEqualTypeOf<never[]>();
      });
      it("should return a tuple of strings if some of the fields are of type `string`", () => {
        const _schema = collection({
          fields: [
            { type: "int32", name: "foo" },
            { type: "string", name: "bar" },
            { type: "string", name: "baz" },
          ],
          name: "users",
        });
        expectTypeOf<QueryBy<typeof _schema.fields>>().toEqualTypeOf<
          ("bar" | "baz")[]
        >();
      });
    });
    describe("GenerateNestedStructure", () => {
      it("should handle non-nested fields", () => {
        const _schema = collection({
          fields: [
            { type: "string", name: "foo" },
            { type: "string", name: "bar" },
          ],
          name: "users",
        });

        expectTypeOf<
          GenerateNestedStructure<typeof _schema.fields, "foo">
        >().toEqualTypeOf<{ foo: string }>();
      });
      it("should handle nested fields", () => {
        const _schema = collection({
          fields: [
            { type: "string", name: "foo" },
            { type: "object", name: "bar" },
            { type: "string", name: "bar.baz" },
          ],
          enable_nested_fields: true,
          name: "users",
        });

        expectTypeOf<
          GenerateNestedStructure<typeof _schema.fields, "bar.baz">
        >().toEqualTypeOf<{ bar: { baz: string } }>();
      });
      it("should handle overlapping paths", () => {
        const _schema = collection({
          fields: [
            { type: "object", name: "foo" },
            { type: "string", name: "foo.bar" },
            { type: "object", name: "foo.bar.baz" },
            { type: "string", name: "foo.bar.baz.qux" },
          ],
          enable_nested_fields: true,
          name: "users",
        });

        expectTypeOf<
          GenerateNestedStructure<typeof _schema.fields, "foo.bar.baz.qux">
        >().toEqualTypeOf<{ "foo.bar.baz": { qux: string } }>();
      });
    });
    describe("GetHighlightsFromParams", () => {
      it("should return an empty tuple if query is wildcard", () => {
        const _schema = collection({
          fields: [
            { type: "string", name: "foo" },
            { type: "string", name: "bar" },
          ],
          name: "users",
        });

        expectTypeOf<
          GetHighlightsFromParams<
            typeof _schema.fields,
            ["foo"],
            ["foo"],
            undefined,
            undefined,
            "*"
          >
        >().toEqualTypeOf<[]>();
      });
      it("should return an empty tuple if highlight_fields is 'none'", () => {
        const _schema = collection({
          fields: [
            { type: "string", name: "foo" },
            { type: "string", name: "bar" },
          ],
          name: "users",
        });

        expectTypeOf<
          GetHighlightsFromParams<
            typeof _schema.fields,
            ["foo"],
            "none",
            undefined,
            undefined,
            "bar"
          >
        >().toEqualTypeOf<[]>();
      });
      it("highlight_fields should take precedence over the rest of the tuples", () => {
        const _schema = collection({
          fields: [
            { type: "string", name: "foo" },
            { type: "string", name: "bar" },
          ],
          name: "users",
        });

        expectTypeOf<
          GetHighlightsFromParams<
            typeof _schema.fields,
            ["foo"],
            ["foo"],
            ["bar"],
            ["foo"],
            "bar"
          >
        >().toEqualTypeOf<["foo"]>();
      });
      it("should return the intersection of the query_by and include_fields if highlight_fields and exclude fields are undefined", () => {
        const _schema = collection({
          fields: [
            { type: "string", name: "foo" },
            { type: "string", name: "bar" },
          ],
          name: "users",
        });

        expectTypeOf<
          GetHighlightsFromParams<
            typeof _schema.fields,
            ["bar", "foo"],
            undefined,
            ["bar"],
            undefined,
            "bar"
          >
        >().toEqualTypeOf<["bar"]>();
      });
      it("should return the intersection of the query_by and exclude_fields if highlight_fields and include_fields are undefined", () => {
        const _schema = collection({
          fields: [
            { type: "string", name: "foo" },
            { type: "string", name: "bar" },
          ],
          name: "users",
        });

        expectTypeOf<
          GetHighlightsFromParams<
            typeof _schema.fields,
            ["bar", "foo"],
            undefined,
            undefined,
            ["bar"],
            "bar"
          >
        >().toEqualTypeOf<["foo"]>();
      });
      it("should return the intersection of the query_by and include_fields and exclude_fields if highlight_fields is undefined", () => {
        const _schema = collection({
          fields: [
            { type: "string", name: "foo" },
            { type: "string", name: "bar" },
          ],
          name: "users",
        });

        expectTypeOf<
          GetHighlightsFromParams<
            typeof _schema.fields,
            ["bar", "foo"],
            undefined,
            ["foo", "bar"],
            ["foo"],
            "bar"
          >
        >().toEqualTypeOf<["bar"]>();
      });
      it("should return query_by if highlight_fields, include_fields and exclude_fields are undefined", () => {
        const _schema = collection({
          fields: [
            { type: "string", name: "foo" },
            { type: "string", name: "bar" },
          ],
          name: "users",
        });

        expectTypeOf<
          GetHighlightsFromParams<
            typeof _schema.fields,
            ["bar", "foo"],
            undefined,
            undefined,
            undefined,
            "bar"
          >
        >().toEqualTypeOf<["bar", "foo"]>();
      });
    });
    describe("GetFieldsInDocumentFromParams", () => {
      it("should exclude fields from include_fields when both params are provided", () => {
        const _schema = collection({
          fields: [
            { type: "string", name: "foo" },
            { type: "string", name: "bar" },
            { type: "string", name: "baz" },
          ],
          name: "users",
        });

        expectTypeOf<
          GetFieldsInDocumentFromParams<
            typeof _schema.fields,
            ["foo", "bar"],
            ["bar"]
          >
        >().toEqualTypeOf<["foo"]>();
      });

      it("should return include_fields when exclude_fields is undefined", () => {
        const _schema = collection({
          fields: [
            { type: "string", name: "foo" },
            { type: "string", name: "bar" },
          ],
          name: "users",
        });

        expectTypeOf<
          GetFieldsInDocumentFromParams<
            typeof _schema.fields,
            ["foo"],
            undefined
          >
        >().toEqualTypeOf<["foo"]>();
      });

      it("should exclude fields from all fields when only exclude_fields provided", () => {
        const _schema = collection({
          fields: [
            { type: "string", name: "foo" },
            { type: "string", name: "bar" },
          ],
          name: "users",
        });
        expectTypeOf<
          GetFieldsInDocumentFromParams<
            typeof _schema.fields,
            undefined,
            ["foo"]
          >
        >().toEqualTypeOf<["bar", "id"]>();
      });

      it("should return all fields when both params are undefined", () => {
        const _schema = collection({
          fields: [
            { type: "string", name: "foo" },
            { type: "string", name: "bar" },
          ],
          name: "users",
        });

        expectTypeOf<
          GetFieldsInDocumentFromParams<
            typeof _schema.fields,
            undefined,
            undefined
          >
        >().toEqualTypeOf<["foo", "bar", "id"]>();
      });

      it("should handle object fields correctly", () => {
        const _schema = collection({
          fields: [
            { type: "string", name: "foo" },
            { type: "object", name: "bar" },
            { type: "string", name: "bar.baz" },
          ],
          enable_nested_fields: true,
          name: "users",
        });

        expectTypeOf<
          GetFieldsInDocumentFromParams<
            typeof _schema.fields,
            ["foo", "bar.baz", "id"],
            undefined
          >
        >().toEqualTypeOf<["foo", "bar.baz", "id", "bar"]>();
      });

      it("should return empty array when all fields are excluded", () => {
        const _schema = collection({
          fields: [
            { type: "string", name: "foo" },
            { type: "string", name: "bar" },
          ],
          name: "users",
        });

        expectTypeOf<
          GetFieldsInDocumentFromParams<
            typeof _schema.fields,
            undefined,
            ["foo", "bar", "id"]
          >
        >().toEqualTypeOf<[]>();
      });
    });
  });
  describe("function tests", () => {
    it("should enforce the same length of query_by_weights to the query_by tuple", async () => {
      await expect(async () => {
        await search(
          "search_test",
          {
            q: "q",
            query_by: ["foo", "quux", "baz.qux"],
            // @ts-expect-error - query_by_weights has a length of 1, while query_by has a length of 3
            query_by_weights: [3],
          },
          config,
        );
      }).rejects.toThrow(
        "Number of weights in `query_by_weights` does not match number of `query_by` fields.",
      );
    });
    it("should enforce the same length of num_typos to the query_by tuple", async () => {
      await expect(async () => {
        await search(
          "search_test",
          {
            q: "q",
            query_by: ["foo", "quux", "baz.qux"],
            // @ts-expect-error - num_typos has a length of 2, while query_by has a length of 3
            num_typos: [0, 1],
          },
          config,
        );
      }).rejects.toThrow(
        "Number of values in `num_typos` does not match number of `query_by` fields.",
      );
    });
    it("should enforce the same length of prefix to the query_by tuple", async () => {
      await expect(async () => {
        await search(
          "search_test",
          {
            q: "q",
            query_by: ["foo", "quux", "baz.qux"],
            // @ts-expect-error - num_typos has a length of 2, while query_by has a length of 3
            prefix: [false, true],
          },
          config,
        );
      }).rejects.toThrow(
        "Number of prefix values in `prefix` does not match number of `query_by` fields.",
      );
    });
    it("should enforce the same length of infix to the query_by tuple", async () => {
      await expect(async () => {
        await search(
          "search_test",
          {
            q: "q",
            query_by: ["foo", "quux", "baz.qux"],
            // @ts-expect-error - num_typos has a length of 2, while query_by has a length of 3
            infix: ["off", "fallback"],
          },
          config,
        );
      }).rejects.toThrow(
        "Number of infix values in `infix` does not match number of `query_by` fields.",
      );
    });
    it("should error if any value in the infix isn't valid", async () => {
      await search(
        "search_test",
        {
          q: "q",
          query_by: ["quux", "foo"],
          // @ts-expect-error - num_typos has a length of 2, while query_by has a length of 3
          infix: ["fallback", "fallback"],
        },
        config,
      );
    });
    it("should error if querying by a field that doesn't exist", async () => {
      await expect(async () => {
        await search(
          "search_test",
          {
            q: "q",
            // @ts-expect-error - does_not_exist doesn't exist in the schema
            query_by: ["foo", "quux", "baz.qux", "does_not_exist"],
          },
          config,
        );
      }).rejects.toThrow(
        "Could not find a field named `does_not_exist` in the schema.",
      );
    });
    it("should error if querying by a non-string field", async () => {
      await expect(async () => {
        await search(
          "search_test",
          {
            q: "q",
            // @ts-expect-error - bar is not of type string
            query_by: ["foo", "bar", "baz.qux"],
          },
          config,
        );
      }).rejects.toThrow("Field `bar` should be a string or a string array.");
    });
    it("should error if querying by a non-indexed field", async () => {
      await expect(async () => {
        await search(
          "search_test",
          {
            q: "q",
            // @ts-expect-error - quuz is not indexed
            query_by: ["foo", "quuz", "baz.qux"],
          },
          config,
        );
      }).rejects.toThrow(
        "Field `quuz` is marked as a non-indexed field in the schema.",
      );
    });
    it("should error if querying by a reference field", async () => {
      await search(
        "search_test",
        {
          q: "q",
          // @ts-expect-error - ref is a reference field
          query_by: ["ref"],
        },
        config,
      );
    });
    it("should error if the filter isn't parsed", async () => {
      await expect(async () => {
        await search(
          "search_test",
          // @ts-expect-error - filter_by is not a valid filter
          {
            q: "q",
            query_by: ["foo", "baz.qux"],
            filter_by: "foo && age:>30",
          },
          config,
        );
      }).rejects.toThrow("Could not parse the filter query.");
    });
    it("should error if the sort_by isn't parsed", async () => {
      await expect(async () => {
        await search(
          "search_test",
          // @ts-expect-error - sort_by is not a valid sort
          {
            q: "q",
            query_by: ["foo", "baz.qux"],
            sort_by: "foo:desc",
          },
          config,
        );
      }).rejects.toThrow(
        "Could not find a field named `foo` in the schema for sorting.",
      );
    });
    describe("highlighting", () => {
      it("should return empty highlights if it's a wildcard query", async () => {
        const res = await search(
          "search_test",
          {
            q: "*",
            query_by: ["foo", "baz.qux"],
            highlight_fields: ["foo"],
          },
          config,
        );
        res.hits.forEach((hit) => {
          expect(hit.highlight).toEqual({});
          expect(hit.highlights).toEqual([]);
        });
      });
      it("should return empty highlights if has highlight_fields set to `none`", async () => {
        const res = await search(
          "search_test",
          {
            q: "q",
            query_by: ["foo", "baz.qux"],
            highlight_fields: "none",
          },
          config,
        );
        res.hits.forEach((hit) => {
          expect(hit.highlight).toEqual({});
          expect(hit.highlights).toEqual([]);
        });
      });
      it("should only include highlighted fields in highlights", async () => {
        const res = await search(
          "search_test",
          {
            q: "q",
            query_by: ["foo", "baz.qux"],
            highlight_fields: ["foo"],
          },
          config,
        );
        res.hits.forEach((hit) => {
          expect(hit.highlight).toHaveProperty("foo");
          expect(hit.highlight).not.toHaveProperty("baz.qux");
          expect(hit.highlights[0]?.field).toEqual("foo");
          expect(hit.highlights).toHaveLength(1);
        });
      });
      it("highlight_fields should take precedence over the rest of the tuples", async () => {
        const res = await search(
          "search_test",
          {
            q: "q",
            query_by: ["foo", "baz.qux"],
            highlight_fields: ["foo"],
            include_fields: ["foo", "baz.qux"],
            exclude_fields: ["foo"],
          },
          config,
        );
        res.hits.forEach((hit) => {
          expect(hit.highlight).toHaveProperty("foo");
          expect(hit.highlight).not.toHaveProperty("baz.qux");
          expect(hit.highlights[0]?.field).toEqual("foo");
          expect(hit.highlights).toHaveLength(1);
        });
      });
      it("should return the intersection of the query_by and include_fields if highlight_fields and exclude fields are undefined", async () => {
        const res = await search(
          "search_test",
          {
            q: "q",
            query_by: ["foo", "baz.qux"],
            include_fields: ["foo"],
          },
          config,
        );
        res.hits.forEach((hit) => {
          expect(hit.highlight).toHaveProperty("foo");
          expect(hit.highlight).not.toHaveProperty("baz.qux");
          expect(hit.highlights[0]?.field).toEqual("foo");
          expect(hit.highlights).toHaveLength(1);
        });
      });
      it("should return the intersection of the query_by and exclude_fields if highlight_fields and include_fields are undefined", async () => {
        const res = await search(
          "search_test",
          {
            q: "qux",
            query_by: ["foo", "baz.qux"],
            exclude_fields: ["foo"],
          },
          config,
        );
        res.hits.forEach((hit) => {
          expect(hit.highlight).not.toHaveProperty("foo");
          expect(hit.highlight.baz).toHaveProperty("qux");
          expect(hit.highlights).toEqual([]);
        });
      });
      it("should return the intersection of the query_by and include_fields and exclude_fields if highlight_fields is undefined", async () => {
        const res = await search(
          "search_test",
          {
            q: "qux",
            query_by: ["foo", "baz.qux"],
            include_fields: ["foo"],
            exclude_fields: ["foo"],
          },
          config,
        );
        res.hits.forEach((hit) => {
          expect(hit.highlight).not.toHaveProperty("foo");
          expect(hit.highlight).not.toHaveProperty("baz");
          expect(hit.highlight).toStrictEqual({});
          expect(hit.highlights).toEqual([]);
        });
      });
      it("should return query_by if highlight_fields, include_fields and exclude_fields are undefined", async () => {
        const res = await search(
          "search_test",
          {
            q: "q",
            query_by: ["foo", "baz.qux"],
          },
          config,
        );
        res.hits.forEach((hit) => {
          expect(hit.highlight).toHaveProperty("foo");
          expect(hit.highlight.baz).toHaveProperty("qux");
          expect(hit.highlights[0]?.field).toEqual("foo");
          expect(hit.highlights).toHaveLength(1);
        });
      });
      it("should remove the `highlights` from hits if `enable_highlight_v1` is false", async () => {
        const res = await search(
          "search_test",
          {
            q: "q",
            query_by: ["foo", "baz.qux"],
            highlight_fields: ["foo"],
            enable_highlight_v1: false,
          },
          config,
        );
        res.hits.forEach((hit) => {
          expect(hit.highlight).toBeDefined();
          expect(hit.highlights).toBeUndefined();
        });
      });
    });
    describe("documents in response", () => {
      it("should exclude fields from include_fields when both params are provided", async () => {
        const res = await search(
          "search_test",
          {
            q: "q",
            query_by: ["foo", "baz.qux"],
            include_fields: ["foo", "baz.qux"],
            exclude_fields: ["foo"],
          },
          config,
        );
        expect(res.hits.length).toBeGreaterThan(0);
        res.hits.forEach((hit) => {
          expect(hit.document).toHaveProperty("baz");
          expect(hit.document).not.toHaveProperty("foo");
        });
      });
      it("should return include_fields when exclude_fields is undefined", async () => {
        const res = await search(
          "search_test",
          {
            q: "q",
            query_by: ["foo", "baz.qux"],
            include_fields: ["foo"],
          },
          config,
        );
        expect(res.hits.length).toBeGreaterThan(0);
        res.hits.forEach((hit) => {
          expect(hit.document).toHaveProperty("foo");
          expect(hit.document).not.toHaveProperty("baz");
          expect(hit.document).not.toHaveProperty("id");
          expect(hit.document).not.toHaveProperty("bar");
          expect(hit.document).not.toHaveProperty("quux");
          expect(hit.document).not.toHaveProperty("quuz");
          expect(hit.document).not.toHaveProperty("ref");
        });
      });
      it("should exclude fields from all fields when only exclude_fields provided", async () => {
        const res = await search(
          "search_test",
          {
            q: "q",
            query_by: ["foo", "baz.qux"],
            exclude_fields: ["foo"],
          },
          config,
        );
        expect(res.hits.length).toBeGreaterThan(0);
        res.hits.forEach((hit) => {
          expect(hit.document).not.toHaveProperty("foo");
          expect(hit.document.id).toBeDefined();
          expect(hit.document.baz).toBeDefined();
          expect(hit.document.baz.qux).toBeDefined();
          expect(hit.document.bar).toBeDefined();
          expect(hit.document.ref).toBeUndefined(); //optional field
        });
      });
      it("should return all fields when both params are undefined", async () => {
        const res = await search(
          "search_test",
          {
            q: "q",
            query_by: ["foo", "baz.qux"],
          },
          config,
        );
        expect(res.hits.length).toBeGreaterThan(0);
        res.hits.forEach((hit) => {
          expect(hit.document.foo).toBeDefined();
          expect(hit.document.id).toBeDefined();
          expect(hit.document.baz).toBeDefined();
          expect(hit.document.baz.qux).toBeDefined();
          expect(hit.document.bar).toBeDefined();
          expect(hit.document.ref).toBeUndefined(); //optional field
        });
      });
      it("should handle object fields correctly", async () => {
        const res = await search(
          "search_test",
          {
            q: "q",
            query_by: ["foo", "baz.qux"],
            include_fields: ["foo", "baz.qux", "id"],
          },
          config,
        );
        expect(res.hits.length).toBeGreaterThan(0);
        res.hits.forEach((hit) => {
          expect(hit.document.foo).toBeDefined();
          expect(hit.document.id).toBeDefined();
          expect(hit.document.baz).toBeDefined();
          expect(hit.document.baz.qux).toBeDefined();
          // @ts-expect-error - bar is not included in the include_fields
          expect(hit.document.bar).toBeUndefined();
          // @ts-expect-error - quux is not included in the include_fields
          expect(hit.document.ref).toBeUndefined(); //optional field
        });
      });
      it("should be empty if all fields are excluded", async () => {
        const res = await search(
          "search_test",
          {
            q: "q",
            query_by: ["foo", "baz.qux"],
            exclude_fields: [
              "foo",
              "baz.qux",
              "id",
              "bar",
              "quux",
              "quuz",
              "ref",
            ],
          },
          config,
        );
        expect(res.hits.length).toBeGreaterThan(0);
        res.hits.forEach((hit) => {
          expect(hit.document).toEqual({});
        });
      });
    });
    describe("group_by", () => {
      it("should error if group_by is not facetable", async () => {
        await expect(async () => {
          await search(
            "search_test",
            {
              q: "q",
              query_by: ["foo", "baz.qux"],
              // @ts-expect-error - foo is not facetable
              group_by: ["foo"],
            },
            config,
          );
        }).rejects.toThrow("Group by field `foo` should be a facet field.");
      });
      it("it should group by that field", async () => {
        const res = await search(
          "search_test",
          {
            q: "q",
            query_by: ["foo", "baz.qux"],
            group_by: ["baz.qux"],
          },
          config,
        );

        expect(res).toHaveProperty("grouped_hits");
        expect(res).toHaveProperty("found_docs");
        res.grouped_hits.forEach((group) => {
          expect(group).toHaveProperty("group_key");
          expectTypeOf(group.group_key).toMatchTypeOf<string[]>();
          expect(group).toHaveProperty("found");
          group.hits.forEach((hit) => {
            expect(hit).toHaveProperty("document");
            expect(hit).toHaveProperty("highlight");
            expect(hit).toHaveProperty("highlights");
          });
        });
      });
    });
  });
  describe("facet_by", () => {
    it("should return an empty array if it's not faceting", async () => {
      const res = await search(
        "search_test",
        {
          q: "q",
          query_by: ["foo", "baz.qux"],
        },
        config,
      );

      expect(res.facet_counts).toEqual([]);
    });
    it("should error if facet_by is not facetable", async () => {
      await expect(async () => {
        await search(
          "search_test",
          {
            q: "q",
            query_by: ["foo", "baz.qux"],
            // @ts-expect-error - foo is not facetable
            facet_by: ["foo"],
          },
          config,
        );
      }).rejects.toThrow(
        "Could not find a facet field named `foo` in the schema.",
      );
    });
    it("the facet_counts length should match the length of the facet_by", async () => {
      const res = await search(
        "search_test",
        {
          q: "q",
          query_by: ["foo", "baz.qux"],
          facet_by: ["baz.qux"],
        },
        config,
      );

      expect(res.facet_counts.length).toBe(1);
      expect(res.facet_counts[0].field_name).toBe("baz.qux");
      expect(res.facet_counts[0].counts).toBeDefined();
      expect(res.facet_counts[0].sampled).toBeDefined();
      expect(res.facet_counts[0].stats.total_values).toBeDefined();
    });
  });
  describe("exclude fields", () => {
    it("should exclude out_of from the response", async () => {
      const res_with = await search(
        "search_test",
        {
          q: "q",
          query_by: ["foo", "baz.qux"],
        },
        config,
      );

      expect(res_with.hits.length).toBeGreaterThan(0);
      expect(res_with).toHaveProperty("out_of");

      const res = await search(
        "search_test",
        {
          q: "q",
          query_by: ["foo", "baz.qux"],
          exclude_fields: ["out_of"],
        },
        config,
      );

      expect(res.hits.length).toBeGreaterThan(0);
      expect(res).not.toHaveProperty("out_of");
    });
    it("should exclude search_time_ms from the response", async () => {
      const res_with = await search(
        "search_test",
        {
          q: "q",
          query_by: ["foo", "baz.qux"],
        },
        config,
      );

      expect(res_with.hits.length).toBeGreaterThan(0);
      expect(res_with).toHaveProperty("search_time_ms");

      const res = await search(
        "search_test",
        {
          q: "q",
          query_by: ["foo", "baz.qux"],
          exclude_fields: ["search_time_ms"],
        },
        config,
      );

      expect(res.hits.length).toBeGreaterThan(0);
      expect(res).not.toHaveProperty("search_time_ms");
    });
  });
});
