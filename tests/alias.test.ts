import { collection } from "@/collection/base";
import { setDefaultConfiguration } from "@/config";
import { alias, retrieveAllAliases } from "@/http/fetch/alias";
import { upAll } from "docker-compose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const isCi = process.env.CI;

const testAlias = alias({
  collection_name: "alias_counter",
  name: "alias",
});

const aliasCollection = collection({
  fields: [
    {
      name: "title",
      type: "string",
    },
  ],
  name: "alias_collection",
});

const aliasCounter = collection({
  fields: [
    {
      name: "counter",
      type: "int32",
    },
  ],
  name: "alias_counter",
});

declare module "@/collection/base" {
  interface GlobalCollections {
    aliasCounter: typeof aliasCounter;
    aliasCollection: typeof aliasCollection;
  }
}
declare module "@/alias" {
  interface GlobalAliases {
    testAlias: typeof testAlias.alias;
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

  const counter = await fetch("http://localhost:8108/collections", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
    body: JSON.stringify(aliasCounter),
  });
  const source = await fetch("http://localhost:8108/collections", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
    body: JSON.stringify(aliasCollection),
  });

  expect(source.ok).toBe(true);

  expect(counter.ok).toBe(true);
});

afterAll(async () => {
  await fetch("http://localhost:8108/collections/alias_counter", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
  });

  await fetch("http://localhost:8108/collections/alias_collection", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
  });
});

describe("aliases", () => {
  describe("upsertAlias", () => {
    afterAll(async () => {
      await fetch("http://localhost:8108/aliases/alias", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-TYPESENSE-API-KEY": "xyz",
        },
      });
    });
    it("shouldn't create an alias for a non-existing collection", () => {
      alias({
        // @ts-expect-error - non-existing collection
        collection_name: "non-existing-collection",
        name: "alias",
      });
    });
    it("should create an alias for an existing collection", async () => {
      const _alias = alias({
        name: "alias",
        collection_name: "source",
      });
      await expect(_alias.upsert()).resolves.toMatchObject({
        name: "alias",
        collection_name: "source",
      });
    });
    it("should update an existing alias", async () => {
      const _alias = alias({
        name: "alias",
        collection_name: "counter",
      });
      await expect(_alias.upsert()).resolves.toMatchObject({
        name: "alias",
        collection_name: "counter",
      });
    });
  });
  describe("retrieveAlias", () => {
    beforeAll(async () => {
      await fetch("http://localhost:8108/aliases/alias", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-TYPESENSE-API-KEY": "xyz",
        },
        body: JSON.stringify(testAlias.alias),
      });
    });
    afterAll(async () => {
      await fetch("http://localhost:8108/aliases/alias", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-TYPESENSE-API-KEY": "xyz",
        },
      });
    });
    it("shouldn't retrieve a non-existing alias", () => {
      const _alias = alias({
        name: "non-existing-alias",
        // @ts-expect-error - non-existing alias
        collection_name: "non-existing-collection",
      });
      return expect(_alias.retrieve()).rejects.toThrow("Not Found");
    });
    it("should retrieve an existing alias", async () => {
      await expect(testAlias.retrieve()).resolves.toMatchObject(
        testAlias.alias,
      );
    });
  });
  describe("retrieveAllAliases", () => {
    beforeAll(async () => {
      await fetch("http://localhost:8108/aliases/alias", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-TYPESENSE-API-KEY": "xyz",
        },
        body: JSON.stringify(testAlias.alias),
      });
    });
    afterAll(async () => {
      await fetch("http://localhost:8108/aliases/alias", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-TYPESENSE-API-KEY": "xyz",
        },
      });
    });
    it("should retrieve all aliases", async () => {
      await expect(retrieveAllAliases()).resolves.toMatchObject({
        aliases: [testAlias.alias],
      });
    });
  });
  describe("deleteAlias", () => {
    beforeAll(async () => {
      await fetch("http://localhost:8108/aliases/alias", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-TYPESENSE-API-KEY": "xyz",
        },
        body: JSON.stringify(testAlias.alias),
      });
    });
    it("should delete an existing alias", async () => {
      await expect(testAlias.delete()).resolves.toMatchObject(testAlias.alias);
    });
  });
});
