import { before } from "node:test";

import { alias } from "@/alias";
import { analyticsRule } from "@/analytics/rules";
import { collection } from "@/collection/base";
import { configure } from "@/config";
import {
  deleteAlias,
  retrieveAlias,
  retrieveAllAliases,
  upsertAlias,
} from "@/http/fetch/alias";
import {
  createAnalyticsRule,
  createEvent,
  deleteAnalyticsRule,
} from "@/http/fetch/analytics";
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

const config = configure({
  apiKey: "xyz",
  nodes: [{ url: "http://localhost:8108" }],
});

declare module "@/collection/base" {
  interface GlobalCollections {
    aliasCounter: typeof aliasCounter;
    aliasCollection: typeof aliasCollection;
  }
}
declare module "@/alias" {
  interface GlobalAliases {
    testAlias: typeof testAlias;
  }
}

beforeAll(async () => {
  if (!isCi) {
    await upAll({ cwd: __dirname, log: true });
  }

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
    it("shouldn't create an alias for a non-existing collection", () =>
      upsertAlias(
        {
          // @ts-expect-error - non-existing collection
          collection_name: "non-existing-collection",
          name: "alias",
        },
        config,
      ));
    it("should create an alias for an existing collection", async () => {
      await expect(
        upsertAlias({ name: "alias", collection_name: "source" }, config),
      ).resolves.toMatchObject({ name: "alias", collection_name: "source" });
    });
    it("should update an existing alias", async () => {
      await expect(
        upsertAlias({ name: "alias", collection_name: "counter" }, config),
      ).resolves.toMatchObject({ name: "alias", collection_name: "counter" });
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
        body: JSON.stringify(testAlias),
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
      return expect(
        // @ts-expect-error - non-existing alias
        retrieveAlias("non-existing-alias", config),
      ).rejects.toThrow("Not Found");
    });
    it("should retrieve an existing alias", async () => {
      await expect(retrieveAlias("alias", config)).resolves.toMatchObject(
        testAlias,
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
        body: JSON.stringify(testAlias),
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
      await expect(retrieveAllAliases(config)).resolves.toMatchObject({
        aliases: [testAlias],
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
        body: JSON.stringify(testAlias),
      });
    });
    it("should delete an existing alias", async () => {
      await expect(deleteAlias("alias", config)).resolves.toMatchObject(
        testAlias,
      );
    });
    it("shouldn't delete a non-existing alias", () => {
      return expect(
        // @ts-expect-error - non-existing alias
        deleteAlias("non-existing-alias", config),
      ).rejects.toThrow("Not Found");
    });
  });
});
