import { collection } from "@/collection/base";
import { configure } from "@/config";
import { createCollection } from "@/http/fetch/collection";
import { multisearch } from "@/http/fetch/multisearch";
import { multisearchEntry } from "@/multisearch";
import { upAll } from "docker-compose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const isCi = process.env.CI;

const _schema_1 = collection({
  fields: [
    { name: "foo", type: "string" },
    { name: "bar", type: "int32" },
    { name: "baz", type: "object" },
    { name: "baz.qux", type: "string", facet: true },
    { name: "quux", type: "string", infix: true },
    { name: "quuz", type: "string", index: false },
  ],
  name: "multi_search_test_1",
  enable_nested_fields: true,
});

const _schema_2 = collection({
  fields: [
    { name: "foo", type: "string" },
    { name: "bar", type: "int32" },
  ],
  name: "multi_search_test_2",
  enable_nested_fields: true,
});

const config = configure({
  apiKey: "xyz",
  nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
});

declare module "@/collection/base" {
  interface GlobalCollections {
    multi_schema_1: typeof _schema_1;
    multi_schema_2: typeof _schema_2;
  }
}

beforeAll(async () => {
  if (!isCi) {
    await upAll({ cwd: __dirname, log: true });
  }
  await createCollection(_schema_1, config);
  await createCollection(_schema_2, config);
  const doc1 = await fetch(
    "http://localhost:8108/collections/multi_search_test_1/documents",
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
  const doc2 = await fetch(
    "http://localhost:8108/collections/multi_search_test_2/documents",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-TYPESENSE-API-KEY": "xyz",
      },
      body: JSON.stringify({
        foo: "quz",
        bar: 12,
      }),
    },
  );
  expect(doc1.ok).toBeTruthy();
  expect(doc2.ok).toBeTruthy();
});

afterAll(async () => {
  await fetch("http://localhost:8108/collections/multi_search_test_2", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
  });
  await fetch("http://localhost:8108/collections/multi_search_test_1", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
  });
});

describe("multisearch tests", () => {
  it("should enforce the same length of query_by_weights to the query_by tuple", async () => {
    const { results } = await multisearch(
      {
        searches: [
          multisearchEntry({
            collection: "multi_search_test_2",
            q: "q",
            query_by: ["foo"],
            highlight_fields: ["foo"],
            // @ts-expect-error - query_by_weights has a length of 2, while query_by has a length of 1
            query_by_weights: [1, 3],
          }),
          multisearchEntry({
            collection: "multi_search_test_2",
            q: "q",
            query_by: ["foo"],
            highlight_fields: ["foo"],
            query_by_weights: [1],
          }),
        ],
      },
      config,
    );

    expect(results.length).toEqual(2);
    expect(results[0].code).toEqual(400);
    expect(results[0].error).toBe(
      "Number of weights in `query_by_weights` does not match number of `query_by` fields.",
    );

    const { hits } = results[1];

    hits.map((hit) => {
      expect(hit.document).toHaveProperty("foo");
      expect(hit.document).toHaveProperty("bar");
      expect(hit.highlight.foo).toBeDefined();
    });
  });
  it("should enforce the same length of num_typos to the query_by tuple", async () => {
    const { results } = await multisearch(
      {
        searches: [
          multisearchEntry({
            collection: "multi_search_test_1",
            q: "q",
            query_by: ["foo", "quux", "baz.qux"],
            // @ts-expect-error - num_typos has a length of 2, while query_by has a length of 3
            num_typos: [0, 1],
          }),
        ],
      },
      config,
    );

    expect(results.length).toEqual(1);
    const [res] = results;
    expect(res.code).toEqual(400);
    expect(res.error).toBe(
      "Number of values in `num_typos` does not match number of `query_by` fields.",
    );
  });
  it("should enforce the same length of prefix to the query_by tuple", async () => {
    const { results } = await multisearch(
      {
        searches: [
          multisearchEntry({
            collection: "multi_search_test_1",
            q: "q",
            query_by: ["foo", "quux", "baz.qux"],
            // @ts-expect-error - num_typos has a length of 2, while query_by has a length of 3
            prefix: [false, true],
          }),
        ],
      },
      config,
    );

    expect(results.length).toEqual(1);
    const [res] = results;
    expect(res.code).toEqual(400);
    expect(res.error).toBe(
      "Number of prefix values in `prefix` does not match number of `query_by` fields.",
    );
  });
  it("should enforce the same length of infix to the query_by tuple", async () => {
    const { results } = await multisearch(
      {
        searches: [
          multisearchEntry({
            collection: "multi_search_test_1",
            q: "q",
            query_by: ["foo", "quux", "baz.qux"],
            // @ts-expect-error - num_typos has a length of 2, while query_by has a length of 3
            infix: ["off", "fallback"],
          }),
        ],
      },
      config,
    );

    expect(results.length).toEqual(1);
    const [res] = results;
    expect(res.code).toEqual(400);
    expect(res.error).toBe(
      "Number of infix values in `infix` does not match number of `query_by` fields.",
    );
  });
  it("should error if any value in the infix isn't valid", async () => {
    await multisearch(
      {
        searches: [
          multisearchEntry({
            collection: "multi_search_test_1",
            q: "q",
            query_by: ["quux", "foo"],
            // @ts-expect-error - num_typos has a length of 2, while query_by has a length of 3
            infix: ["fallback", "fallback"],
          }),
        ],
      },
      config,
    );
  });
  it("should error if querying by a field that doesn't exist", async () => {
    const { results } = await multisearch(
      {
        searches: [
          multisearchEntry({
            collection: "multi_search_test_1",
            q: "q",
            // @ts-expect-error - does_not_exist doesn't exist in the schema
            query_by: ["foo", "quux", "baz.qux", "does_not_exist"],
          }),
        ],
      },
      config,
    );

    expect(results.length).toEqual(1);
    const [res] = results;
    expect(res.code).toEqual(404);
    expect(res.error).toBe(
      "Could not find a field named `does_not_exist` in the schema.",
    );
  });
  it("should error if querying by a non-string field", async () => {
    const { results } = await multisearch(
      {
        searches: [
          multisearchEntry({
            collection: "multi_search_test_1",
            q: "q",
            // @ts-expect-error - bar is not of type string
            query_by: ["foo", "bar", "baz.qux"],
          }),
        ],
      },
      config,
    );

    expect(results.length).toEqual(1);
    const [res] = results;
    expect(res.code).toEqual(400);
    expect(res.error).toBe("Field `bar` should be a string or a string array.");
  });
  it("should error if querying by a non-indexed field", async () => {
    const { results } = await multisearch(
      {
        searches: [
          multisearchEntry({
            collection: "multi_search_test_1",
            q: "q",
            // @ts-expect-error - quuz is not indexed
            query_by: ["foo", "quuz", "baz.qux"],
          }),
        ],
      },

      config,
    );

    expect(results.length).toEqual(1);
    const [res] = results;
    expect(res.code).toEqual(400);
    expect(res.error).toBe(
      "Field `quuz` is marked as a non-indexed field in the schema.",
    );
  });
  it("should error if querying by a reference field", async () => {
    await multisearch(
      {
        searches: [
          multisearchEntry({
            collection: "multi_search_test_1",
            q: "q",
            // @ts-expect-error - ref is a reference field
            query_by: ["ref"],
          }),
        ],
      },
      config,
    );
  });
  it("should error if the filter isn't parsed", async () => {
    const { results } = await multisearch(
      {
        searches: [
          // @ts-expect-error - filter_by is not a valid filter
          multisearchEntry({
            collection: "multi_search_test_1",
            q: "q",
            query_by: ["foo", "baz.qux"],
            filter_by: "foo && age:>30",
          }),
        ],
      },
      config,
    );

    expect(results.length).toEqual(1);
    const [res] = results;
    expect(res.code).toEqual(400);
    expect(res.error).toBe("Could not parse the filter query.");
  });
  it("should error if the sort_by isn't parsed", async () => {
    const { results } = await multisearch(
      {
        searches: [
          // @ts-expect-error - sort_by is not a valid sort
          multisearchEntry({
            collection: "multi_search_test_1",
            q: "q",
            query_by: ["foo", "baz.qux"],
            sort_by: "foo:desc",
          }),
        ],
      },
      config,
    );

    expect(results.length).toEqual(1);
    const [res] = results;
    expect(res.code).toEqual(404);
    expect(res.error).toBe(
      "Could not find a field named `foo` in the schema for sorting.",
    );
  });
  describe("highlighting", () => {
    it("should return empty highlights if it's a wildcard query", async () => {
      const {
        results: [res_1, res_2],
      } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "*",
              query_by: ["foo", "baz.qux"],
              highlight_fields: ["foo"],
            }),
            multisearchEntry({
              collection: "multi_search_test_2",
              q: "*",
              query_by: ["foo"],
              highlight_fields: ["foo"],
            }),
          ],
        },
        config,
      );
      res_1.hits.forEach((hit) => {
        expect(hit.highlight).toEqual({});
        expect(hit.highlights).toEqual([]);
      });
      res_2.hits.forEach((hit) => {
        expect(hit.highlight).toEqual({});
        expect(hit.highlights).toEqual([]);
      });
    });
    it("should return empty highlights if has highlight_fields set to `none`", async () => {
      const {
        results: [res_1, res_2],
      } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "q",
              query_by: ["foo", "baz.qux"],
              highlight_fields: "none",
            }),
            multisearchEntry({
              collection: "multi_search_test_2",
              q: "q",
              query_by: ["foo"],
              highlight_fields: "none",
            }),
          ],
        },
        config,
      );
      res_1.hits.forEach((hit) => {
        expect(hit.highlight).toEqual({});
        expect(hit.highlights).toEqual([]);
      });
      res_2.hits.forEach((hit) => {
        expect(hit.highlight).toEqual({});
        expect(hit.highlights).toEqual([]);
      });
    });
    it("should only include highlighted fields in highlights", async () => {
      const {
        results: [res_1, res_2],
      } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "q",
              query_by: ["foo", "baz.qux"],
              highlight_fields: ["foo"],
            }),
            multisearchEntry({
              collection: "multi_search_test_2",
              q: "q",
              query_by: ["foo"],
              highlight_fields: ["foo"],
            }),
          ],
        },
        config,
      );
      res_1.hits.forEach((hit) => {
        expect(hit.highlight).toHaveProperty("foo");
        expect(hit.highlight).not.toHaveProperty("baz.qux");
        expect(hit.highlights[0]?.field).toEqual("foo");
        expect(hit.highlights).toHaveLength(1);
      });
      res_2.hits.forEach((hit) => {
        expect(hit.highlight).toHaveProperty("foo");
        expect(hit.highlight).not.toHaveProperty("bar");
        expect(hit.highlights[0]?.field).toEqual("foo");
        expect(hit.highlights).toHaveLength(1);
      });
    });
    it("highlight_fields should take precedence over the rest of the tuples", async () => {
      const {
        results: [res_1, res_2],
      } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "q",
              query_by: ["foo", "baz.qux"],
              highlight_fields: ["foo"],
              include_fields: ["foo"],
              exclude_fields: ["foo"],
            }),
            multisearchEntry({
              collection: "multi_search_test_2",
              q: "q",
              query_by: ["foo"],
              highlight_fields: ["foo"],
              include_fields: ["foo"],
              exclude_fields: ["foo"],
            }),
          ],
        },
        config,
      );
      res_1.hits.forEach((hit) => {
        expect(hit.highlight).toHaveProperty("foo");
        expect(hit.highlight).not.toHaveProperty("baz.qux");
        expect(hit.highlights[0]?.field).toEqual("foo");
        expect(hit.highlights).toHaveLength(1);
      });
      res_2.hits.forEach((hit) => {
        expect(hit.highlight).toHaveProperty("foo");
        expect(hit.highlight).not.toHaveProperty("bar");
        expect(hit.highlights[0]?.field).toEqual("foo");
        expect(hit.highlights).toHaveLength(1);
      });
    });
    it("should return the intersection of the query_by and include_fields if highlight_fields and exclude fields are undefined", async () => {
      const {
        results: [res_1, res_2],
      } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "q",
              query_by: ["foo", "baz.qux"],
              include_fields: ["foo"],
            }),
            multisearchEntry({
              collection: "multi_search_test_2",
              q: "q",
              query_by: ["foo"],
              include_fields: ["foo"],
            }),
          ],
        },
        config,
      );
      res_1.hits.forEach((hit) => {
        expect(hit.highlight).toHaveProperty("foo");
        expect(hit.highlight).not.toHaveProperty("baz.qux");
        expect(hit.highlights[0]?.field).toEqual("foo");
        expect(hit.highlights).toHaveLength(1);
      });
      res_2.hits.forEach((hit) => {
        expect(hit.highlight).toHaveProperty("foo");
        expect(hit.highlight).not.toHaveProperty("bar");
        expect(hit.highlights[0]?.field).toEqual("foo");
        expect(hit.highlights).toHaveLength(1);
      });
    });
    it("should return the intersection of the query_by and exclude_fields if highlight_fields and include_fields are undefined", async () => {
      const {
        results: [res_1, res_2],
      } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "qux",
              query_by: ["foo", "baz.qux"],
              exclude_fields: ["foo"],
            }),
            multisearchEntry({
              collection: "multi_search_test_2",
              q: "qux",
              query_by: ["foo"],
              exclude_fields: ["foo"],
            }),
          ],
        },
        config,
      );
      res_1.hits.forEach((hit) => {
        expect(hit.highlight).not.toHaveProperty("foo");
        expect(hit.highlight).toHaveProperty("baz");
        expect(hit.highlight).toHaveProperty("baz.qux");
        expect(hit.highlights).toEqual([]);
      });
      res_2.hits.forEach((hit) => {
        expect(hit.highlight).not.toHaveProperty("foo");
        expect(hit.highlight).not.toHaveProperty("bar");
        expect(hit.highlight).toEqual({});
        expect(hit.highlights).toEqual([]);
      });
    });
    it("should return the intersection of the query_by and include_fields and exclude_fields if highlight_fields is undefined", async () => {
      const {
        results: [res_1, res_2],
      } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "q",
              query_by: ["foo", "baz.qux"],
              include_fields: ["foo", "baz.qux"],
              exclude_fields: ["foo"],
            }),
            multisearchEntry({
              collection: "multi_search_test_2",
              q: "q",
              query_by: ["foo"],
              include_fields: ["foo"],
              exclude_fields: ["foo"],
            }),
          ],
        },
        config,
      );
      res_1.hits.forEach((hit) => {
        expect(hit.highlight).toHaveProperty("baz");
        expect(hit.highlight).toHaveProperty("baz.qux");
        expect(hit.highlight).not.toHaveProperty("foo");
        expect(hit.highlights).toHaveLength(0);
      });
      res_2.hits.forEach((hit) => {
        expect(hit.highlight).not.toHaveProperty("bar");
        expect(hit.highlight).toEqual({});
        expect(hit.highlights).toEqual([]);
      });
    });
    it("should return query_by if highlight_fields, include_fields and exclude_fields are undefined", async () => {
      const {
        results: [res_1, res_2],
      } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "q",
              query_by: ["foo", "baz.qux"],
            }),
            multisearchEntry({
              collection: "multi_search_test_2",
              q: "q",
              query_by: ["foo"],
            }),
          ],
        },
        config,
      );
      res_1.hits.forEach((hit) => {
        expect(hit.highlight).toHaveProperty("foo");
        expect(hit.highlight).toHaveProperty("baz.qux");
        expect(hit.highlights[0]?.field).toEqual("foo");
        expect(hit.highlights).toHaveLength(1);
      });
      res_2.hits.forEach((hit) => {
        expect(hit.highlight).toHaveProperty("foo");
        expect(hit.highlight).not.toHaveProperty("bar");
        expect(hit.highlights[0]?.field).toEqual("foo");
        expect(hit.highlights).toHaveLength(1);
      });
    });
    it("should remove the `highlights` from hits if `enable_highlight_v1` is false", async () => {
      const {
        results: [res_1, res_2],
      } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "q",
              query_by: ["foo", "baz.qux"],
              highlight_fields: ["foo"],
              enable_highlight_v1: false,
            }),
            multisearchEntry({
              collection: "multi_search_test_2",
              q: "q",
              query_by: ["foo"],
              highlight_fields: ["foo"],
              enable_highlight_v1: false,
            }),
          ],
        },
        config,
      );
      res_1.hits.forEach((hit) => {
        expect(hit.highlight).toHaveProperty("foo");
        expect(hit.highlight).not.toHaveProperty("baz.qux");
        expect(hit.highlights).toBeUndefined();
      });
      res_2.hits.forEach((hit) => {
        expect(hit.highlight).toHaveProperty("foo");
        expect(hit.highlight).not.toHaveProperty("bar");
        expect(hit.highlights).toBeUndefined();
      });
    });
  });
  describe("documents in response", () => {
    it("should exclude fields from include_fields when both params are provided", async () => {
      const {
        results: [res_1, res_2],
      } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "q",
              query_by: ["foo", "baz.qux"],
              include_fields: ["foo", "baz.qux"],
              exclude_fields: ["foo"],
            }),
            multisearchEntry({
              collection: "multi_search_test_2",
              q: "q",
              query_by: ["foo"],
              include_fields: ["foo"],
              exclude_fields: ["foo"],
            }),
          ],
        },
        config,
      );
      res_1.hits.forEach((hit) => {
        expect(hit.document).not.toHaveProperty("foo");
        expect(hit.document).toHaveProperty("baz");
        expect(hit.document).toHaveProperty("baz.qux");
        expect(hit.document).not.toHaveProperty("id");
        expect(hit.document).not.toHaveProperty("bar");
        expect(hit.document).not.toHaveProperty("quux");
        expect(hit.document).not.toHaveProperty("quuz");
      });
      res_2.hits.forEach((hit) => {
        expect(hit.document).toEqual({});
      });
    });
    it("should return include_fields when exclude_fields is undefined", async () => {
      const {
        results: [res_1, res_2],
      } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "q",
              query_by: ["foo", "baz.qux"],
              include_fields: ["foo", "baz.qux"],
            }),
            multisearchEntry({
              collection: "multi_search_test_2",
              q: "q",
              query_by: ["foo"],
              include_fields: ["foo"],
            }),
          ],
        },
        config,
      );
      res_1.hits.forEach((hit) => {
        expect(hit.document).toHaveProperty("foo");
        expect(hit.document).toHaveProperty("baz");
        expect(hit.document.baz).toHaveProperty("qux");
        expect(hit.document).not.toHaveProperty("id");
        expect(hit.document).not.toHaveProperty("bar");
        expect(hit.document).not.toHaveProperty("quux");
        expect(hit.document).not.toHaveProperty("quuz");
      });
      res_2.hits.forEach((hit) => {
        expect(hit.document).toHaveProperty("foo");
        expect(hit.document).not.toHaveProperty("id");
        expect(hit.document).not.toHaveProperty("bar");
      });
    });
    it("should exclude fields from all fields when only exclude_fields provided", async () => {
      const {
        results: [res_1, res_2],
      } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "q",
              query_by: ["foo", "baz.qux"],
              exclude_fields: ["foo", "baz.qux", "id", "bar", "quux", "quuz"],
            }),
            multisearchEntry({
              collection: "multi_search_test_2",
              q: "q",
              query_by: ["foo"],
              exclude_fields: ["foo", "id", "bar"],
            }),
          ],
        },
        config,
      );
      res_1.hits.forEach((hit) => {
        expect(hit.document).toEqual({});
      });
      res_2.hits.forEach((hit) => {
        expect(hit.document).toEqual({});
      });
    });
    it("should return all fields when both params are undefined", async () => {
      const {
        results: [res_1, res_2],
      } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "q",
              query_by: ["foo", "baz.qux"],
            }),
            multisearchEntry({
              collection: "multi_search_test_2",
              q: "q",
              query_by: ["foo"],
            }),
          ],
        },
        config,
      );
      res_1.hits.forEach((hit) => {
        expect(hit.document).toHaveProperty("foo");
        expect(hit.document).toHaveProperty("baz");
        expect(hit.document).toHaveProperty("baz.qux");
        expect(hit.document).toHaveProperty("id");
        expect(hit.document).toHaveProperty("bar");
        expect(hit.document).toHaveProperty("quux");
        expect(hit.document).toHaveProperty("quuz");
      });
      res_2.hits.forEach((hit) => {
        expect(hit.document).toHaveProperty("foo");
        expect(hit.document).toHaveProperty("id");
        expect(hit.document).toHaveProperty("bar");
      });
    });
    it("should handle object fields correctly", async () => {
      const { results } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "q",
              query_by: ["foo", "baz.qux"],
            }),
            multisearchEntry({
              collection: "multi_search_test_2",
              q: "q",
              query_by: ["foo"],
            }),
          ],
        },
        config,
      );
      results.forEach((res) => {
        res.hits.forEach((hit) => {
          expect(hit.document).toHaveProperty("foo");
          expect(hit.document).toHaveProperty("bar");
          expect(hit.document).toHaveProperty("id");
        });
      });
    });
    it("should be empty if all fields are excluded", async () => {
      const { results } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "q",
              query_by: ["foo", "baz.qux"],
              exclude_fields: ["foo", "baz.qux", "id", "bar", "quux", "quuz"],
            }),
            multisearchEntry({
              collection: "multi_search_test_2",
              q: "q",
              query_by: ["foo"],
              exclude_fields: ["foo", "id", "bar"],
            }),
          ],
        },
        config,
      );
      results.forEach((res) => {
        res.hits.forEach((hit) => {
          expect(hit.document).toEqual({});
        });
      });
    });
  });
  describe("group_by", () => {
    it("should error if group_by is not facetable", async () => {
      const { results } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "q",
              query_by: ["foo", "baz.qux"],
              // @ts-expect-error - foo is not facetable
              group_by: ["foo"],
            }),
          ],
        },
        config,
      );

      expect(results.length).toEqual(1);
      const [res] = results;
      expect(res.code).toEqual(400);
      expect(res.error).toBe("Group by field `foo` should be a facet field.");
    });
    it("it should group by that field", async () => {
      const { results } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "q",
              query_by: ["foo", "baz.qux"],
              group_by: ["baz.qux"],
            }),
          ],
        },
        config,
      );

      expect(results.length).toEqual(1);
      const [res] = results;
      expect(res.grouped_hits).toBeDefined();
    });
  });
  describe("facet_by", () => {
    it("should return an empty array if it's not faceting", async () => {
      const { results } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "q",
              query_by: ["foo", "baz.qux"],
            }),
          ],
        },
        config,
      );

      expect(results.length).toEqual(1);
      const [res] = results;
      expect(res.facet_counts).toEqual([]);
    });
    it("should error if facet_by is not facetable", async () => {
      const { results } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "q",
              query_by: ["foo", "baz.qux"],
              // @ts-expect-error - foo is not facetable
              facet_by: ["foo"],
            }),
          ],
        },
        config,
      );

      expect(results.length).toEqual(1);
      const [res] = results;
      expect(res.code).toEqual(404);
      expect(res.error).toBe(
        "Could not find a facet field named `foo` in the schema.",
      );
    });
    it("the facet_counts length should match the length of the facet_by", async () => {
      const { results } = await multisearch(
        {
          searches: [
            multisearchEntry({
              collection: "multi_search_test_1",
              q: "q",
              query_by: ["foo", "baz.qux"],
              facet_by: ["baz.qux"],
            }),
          ],
        },
        config,
      );

      expect(results.length).toEqual(1);
      const [res] = results;
      expect(res.facet_counts).toHaveLength(1);
    });
    describe("exclude fields", () => {
      it("should exclude out_of from the response", async () => {
        const { results } = await multisearch(
          {
            searches: [
              multisearchEntry({
                collection: "multi_search_test_1",
                q: "q",
                query_by: ["foo", "baz.qux"],
                exclude_fields: ["out_of"],
              }),
              multisearchEntry({
                collection: "multi_search_test_2",
                q: "q",
                query_by: ["foo"],
              }),
            ],
          },
          config,
        );

        expect(results.length).toEqual(2);
        const [res_1, res_2] = results;

        expect(res_1).not.toHaveProperty("out_of");
        expect(res_2.out_of).toBeDefined();
      });
      it("should exclude search_time_ms from the response", async () => {
        const { results } = await multisearch(
          {
            searches: [
              multisearchEntry({
                collection: "multi_search_test_1",
                q: "q",
                query_by: ["foo", "baz.qux"],
                exclude_fields: ["search_time_ms"],
              }),
              multisearchEntry({
                collection: "multi_search_test_2",
                q: "q",
                query_by: ["foo"],
              }),
            ],
          },
          config,
        );

        expect(results.length).toEqual(2);
        const [res_1, res_2] = results;

        expect(res_1).not.toHaveProperty("search_time_ms");
        expect(res_2.search_time_ms).toBeDefined();
      });
    });
  });
});
