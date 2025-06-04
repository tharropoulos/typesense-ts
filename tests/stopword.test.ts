import { setDefaultConfiguration } from "@/config";
import { collection } from "@/http/fetch/collection";
import { stopword } from "@/http/fetch/stopword";
import { upAll } from "docker-compose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const isCi = process.env.CI;

const stopwordCollection = collection({
  fields: [
    {
      name: "title",
      type: "string",
    },
    {
      name: "content",
      type: "string",
    },
    {
      name: "category",
      type: "string",
      facet: true,
    },
  ],
  name: "stopword_collection",
});

const testStopword = stopword("test_stopword", {
  stopwords: ["the", "and", "or"],
  locale: "en",
});

const basicStopword = stopword("basic_stopword", {
  stopwords: ["a", "an", "the"],
});

declare module "@/collection" {
  interface Collections {
    stopwordCollection: typeof stopwordCollection.schema;
  }
}

declare module "@/stopword" {
  interface Stopwords {
    testStopword: typeof testStopword.stopword;
    basicStopword: typeof basicStopword.stopword;
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
    body: JSON.stringify(stopwordCollection.schema),
  });

  console.log(await collection.json());
  expect(collection.ok).toBe(true);

  const documents = [
    {
      id: "1",
      title: "The quick brown fox",
      content: "A story about a fox and the farmer",
      category: "Fiction",
    },
    {
      id: "2",
      title: "JavaScript and TypeScript guide",
      content: "Learn the basics of JavaScript or TypeScript",
      category: "Programming",
    },
    {
      id: "3",
      title: "The art of cooking",
      content: "A comprehensive guide to cooking",
      category: "Cooking",
    },
    {
      id: "4",
      title: "Machine learning basics",
      content: "Introduction to machine learning and AI",
      category: "Technology",
    },
    {
      id: "5",
      title: "The history of computers",
      content: "From the first computer to modern systems",
      category: "Technology",
    },
  ];

  const jsonlData = documents.map((doc) => JSON.stringify(doc)).join("\n");

  await fetch(
    "http://localhost:8108/collections/stopword_collection/documents/import",
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
  await fetch("http://localhost:8108/collections/stopword_collection", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
  });
});

describe("stopwords", () => {
  describe("function tests", () => {
    describe("upsertStopword", () => {
      it("should create a new stopword set", async () => {
        const _stopword = stopword("test_stopword", {
          stopwords: ["the", "and", "or"],
          locale: "en",
        });

        await expect(_stopword.upsert()).resolves.toMatchObject({
          id: "test_stopword",
          stopwords: ["the", "and", "or"],
          locale: "en",
        });

        await _stopword.delete();
      });

      it("should update an existing stopword set", async () => {
        const _stopword = stopword("test_stopword", {
          stopwords: ["a", "an", "the", "is", "are"],
          locale: "en",
        });

        await expect(_stopword.upsert()).resolves.toMatchObject({
          id: "test_stopword",
          stopwords: ["a", "an", "the", "is", "are"],
          locale: "en",
        });

        const _updatedStopword = stopword("test_stopword", {
          stopwords: ["a", "an", "the", "is", "are", "was", "were"],
          locale: "en",
        });

        await expect(_updatedStopword.upsert()).resolves.toMatchObject({
          id: "test_stopword",
        });

        const res = await _stopword.retrieve();
        expect(res.stopwords).toBeDefined();
        expect(res.stopwords.id).toBe("test_stopword");
        expect(res.stopwords.stopwords).toEqual([
          "are",
          "a",
          "were",
          "is",
          "the",
          "an",
          "was",
        ]);

        await _stopword.delete();
      });

      it("should create a stopword set without locale", async () => {
        const _stopword = stopword("no_locale_stopword", {
          stopwords: ["stop", "word"],
        });

        await expect(_stopword.upsert()).resolves.toMatchObject({
          id: "no_locale_stopword",
          stopwords: ["stop", "word"],
        });

        await _stopword.delete();
      });
    });

    describe("retrieveStopword", () => {
      beforeAll(async () => {
        await fetch("http://localhost:8108/stopwords/test_stopword", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-TYPESENSE-API-KEY": "xyz",
          },
          body: JSON.stringify({
            stopwords: ["the", "and", "or"],
            locale: "en",
          }),
        });
      });

      afterAll(async () => {
        await fetch("http://localhost:8108/stopwords/test_stopword", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-TYPESENSE-API-KEY": "xyz",
          },
        });
      });

      it("shouldn't retrieve a non-existing stopword", () => {
        const _stopword = stopword("non-existing-stopword", {
          stopwords: ["test"],
        });
        return expect(_stopword.retrieve()).rejects.toThrow(
          "Stopword `non-existing-stopword` not found.",
        );
      });

      it("should retrieve an existing stopword", async () => {
        const res = await testStopword.retrieve();
        expect(res.stopwords).toBeDefined();
        expect(res.stopwords.id).toBe("test_stopword");
        expect(res.stopwords.stopwords).toEqual(["and", "or", "the"]);
        expect(res.stopwords.locale).toBe("en");
      });
    });

    describe("deleteStopword", () => {
      beforeAll(async () => {
        const res = await fetch(
          "http://localhost:8108/stopwords/test_stopword",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-TYPESENSE-API-KEY": "xyz",
            },
            body: JSON.stringify({
              stopwords: ["the", "and", "or"],
              locale: "en",
            }),
          },
        );

        expect(res.ok).toBe(true);
      });

      it("should delete an existing stopword", async () => {
        await expect(testStopword.delete()).resolves.toMatchObject({
          id: "test_stopword",
        });
      });

      it("shouldn't delete a non-existing stopword", async () => {
        const _stopword = stopword("non-existing-stopword", {
          stopwords: ["test"],
        });
        return expect(_stopword.delete()).rejects.toThrow(
          "Stopword `non-existing-stopword` not found.",
        );
      });
    });

    describe("search with stopwords", () => {
      beforeAll(async () => {
        await basicStopword.upsert();
      });

      afterAll(async () => {
        await basicStopword.delete();
      });

      it("should apply stopwords in search", async () => {
        const resWithoutStopwords = await stopwordCollection.search({
          q: "the",
          query_by: ["title", "content"],
        });

        // Search with stopwords - should ignore "the" and focus on "guide"
        const resWithStopwords = await stopwordCollection.search({
          q: "the",
          query_by: ["title", "content"],
          stopwords: ["basic_stopword"],
        });

        // Both should return results, but stopwords may affect ranking
        expect(resWithoutStopwords.hits.length).toBeGreaterThan(0);
        expect(resWithStopwords.hits.length).toBe(0);
      });

      it("should error for invalid stopword sets", async () => {
        await expect(
          stopwordCollection.search({
            q: "the quick brown fox",
            query_by: ["title", "content"],
            // @ts-expect-error - invalid stopword set
            stopwords: "the,quick",
          }),
        ).rejects.toThrow("Could not find the stopword set named `the,quick`.");
      });
    });
  });
});
