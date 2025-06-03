import { setDefaultConfiguration } from "@/config";
import { collection } from "@/http/fetch/collection";
import { override } from "@/http/fetch/override";
import type { CheckCollectionOverrides } from "@/override";
import { upAll } from "docker-compose";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  expectTypeOf,
  it,
} from "vitest";

const isCi = process.env.CI;

const overrideCollection = collection({
  fields: [
    {
      name: "title",
      type: "string",
    },
    {
      name: "category",
      type: "string",
      facet: true,
    },
  ],
  name: "override_collection",
});

const testOverride = override("test_override", {
  collection: "override_collection",
  rule: {
    query: "apple",
    match: "exact",
  },
  includes: [{ id: "1", position: 1 }],
  remove_matched_tokens: false,
});

const taggedOverride = override("tagged_override", {
  collection: "override_collection",
  rule: {
    tags: ["tag1", "tag2"],
  },
  filter_by: "category:=Food",
});

declare module "@/collection" {
  interface GlobalCollections {
    overrideCollection: typeof overrideCollection.schema;
  }
}

declare module "@/override" {
  interface GlobalOverrides {
    testOverride: typeof testOverride.override;
    taggedOverride: typeof taggedOverride.override;
  }
}

beforeAll(async () => {
  if (!isCi) {
    await upAll({ cwd: __dirname, log: true });
  }

  setDefaultConfiguration({
    apiKey: "xyz",
    nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
  });

  const collection = await fetch("http://localhost:8108/collections", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
    body: JSON.stringify(overrideCollection.schema),
  });

  expect(collection.ok).toBe(true);

  // Add test documents to the collection using JSONL format
  const documents = [
    { id: "1", title: "Apple iPhone", category: "Electronics" },
    { id: "2", title: "Apple MacBook", category: "Electronics" },
    { id: "3", title: "Apple Watch", category: "Electronics" },
    { id: "4", title: "Samsung Galaxy", category: "Electronics" },
    { id: "5", title: "Green Apple Fruit", category: "Food" },
  ];

  const jsonlData = documents.map((doc) => JSON.stringify(doc)).join("\n");

  await fetch(
    "http://localhost:8108/collections/override_collection/documents/import",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/jsonl",
        "X-TYPESENSE-API-KEY": "xyz",
      },
      body: jsonlData,
    },
  );
});

afterAll(async () => {
  await fetch("http://localhost:8108/collections/override_collection", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
  });
});

describe("overrides", () => {
  describe("type tests", () => {
    it("provide typing for registered overrides", () => {
      expectTypeOf<
        CheckCollectionOverrides<"override_collection">
      >().toEqualTypeOf<string[] | ("tag1" | "tag2")[]>();
    });

    it("should error for non-existing collection", () => {
      expectTypeOf<
        CheckCollectionOverrides<"non-existing-collection">
      >().toEqualTypeOf<"[Error on collection name]: non-existing-collection is not registered in GlobalCollections">();
    });

    it("should error for non-existing collection", () => {
      expectTypeOf<
        CheckCollectionOverrides<"search_test">
      >().toEqualTypeOf<"[Error on tags]: No tags found for collection search_test">();
    });
  });

  describe("function tests", () => {
    describe("upsertOverride", () => {
      afterAll(async () => {
        await fetch("http://localhost:8108/overrides/test_override", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-TYPESENSE-API-KEY": "xyz",
          },
        });
      });

      it("shouldn't create an override for a non-existing collection", () => {
        override("invalid_override", {
          // @ts-expect-error - non-existing collection
          collection: "non-existing-collection",
          rule: {
            query: "test",
            match: "exact",
          },
        });
      });

      it("should create an override for an existing collection", async () => {
        const _override = override("test_override", {
          collection: "override_collection",
          rule: {
            query: "apple",
            match: "exact",
          },
          includes: [{ id: "1", position: 1 }],
        });

        await expect(_override.upsert()).resolves.toMatchObject({
          id: "test_override",
          rule: {
            query: "apple",
            match: "exact",
          },
          includes: [{ id: "1", position: 1 }],
        });
      });

      it("should update an existing override", async () => {
        const _override = override("test_override", {
          collection: "override_collection",
          rule: {
            query: "iphone",
            match: "contains",
          },
          includes: [{ id: "1", position: 2 }],
          remove_matched_tokens: true,
        });

        await expect(_override.upsert()).resolves.toMatchObject({
          id: "test_override",
          rule: {
            query: "iphone",
            match: "contains",
          },
          includes: [{ id: "1", position: 2 }],
          remove_matched_tokens: true,
        });
      });
    });

    describe("retrieveOverride", () => {
      beforeAll(async () => {
        await fetch(
          "http://localhost:8108/collections/override_collection/overrides/test_override",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-TYPESENSE-API-KEY": "xyz",
            },
            body: JSON.stringify({
              collection: "override_collection",
              rule: {
                query: "apple",
                match: "exact",
              },
              includes: [{ id: "1", position: 1 }],
            }),
          },
        );
      });

      afterAll(async () => {
        await fetch("http://localhost:8108/overrides/test_override", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-TYPESENSE-API-KEY": "xyz",
          },
        });
      });

      it("shouldn't retrieve a non-existing override", () => {
        const _override = override("non-existing-override", {
          // @ts-expect-error - non-existing collection
          collection: "non-existing-collection",
          rule: {
            query: "test",
            match: "exact",
          },
        });
        return expect(_override.retrieve()).rejects.toThrow("Not Found");
      });

      it("should retrieve an existing override", async () => {
        await expect(testOverride.retrieve()).resolves.toMatchObject({
          id: "test_override",
          rule: {
            query: "apple",
            match: "exact",
          },
          includes: [{ id: "1", position: 1 }],
        });
      });
    });

    describe("deleteOverride", () => {
      beforeAll(async () => {
        const res = await fetch(
          "http://localhost:8108/collections/override_collection/overrides/test_override",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-TYPESENSE-API-KEY": "xyz",
            },
            body: JSON.stringify({
              collection: "override_collection",
              rule: {
                query: "apple",
                match: "exact",
              },
              includes: [{ id: "1", position: 1 }],
            }),
          },
        );

        expect(res.ok).toBe(true);
      });

      it("should delete an existing override", async () => {
        await expect(testOverride.delete()).resolves.toMatchObject({
          id: "test_override",
        });
      });
    });

    describe("search with tags", () => {
      beforeAll(async () => {
        await taggedOverride.upsert();
      });

      afterAll(async () => {
        await taggedOverride.delete();
      });

      it("shouldn't apply non-existing overrides", async () => {
        const res = await overrideCollection.search({
          q: "*",
          query_by: ["title"],
          override_tags: ["non-existent"],
        });

        expect(res.hits.length).toBe(5);
      });
      it("should apply the override", async () => {
        const res = await overrideCollection.search({
          q: "*",
          query_by: ["title"],
          override_tags: ["tag1"],
        });

        // 5 documents in the collection, 1 document with the category of Food
        expect(res.hits.length).toBe(1);
      });
    });
  });
});
