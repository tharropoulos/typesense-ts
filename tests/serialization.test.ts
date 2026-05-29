import { configure, setDefaultConfiguration } from "@/config";
import { collection } from "@/http/fetch";
import { multisearch } from "@/http/fetch/multisearch";
import { multisearchEntry } from "@/multisearch";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { testNode } from "./support";

// Stub fetch so we can assert how array params are serialized onto the wire
// without needing a live Typesense instance.

const _serialization_schema = collection({
  fields: [
    { name: "content", type: "string" },
    { name: "title", type: "string" },
  ],
  name: "serialization_test",
});

declare module "@/collection/base" {
  interface Collections {
    serialization_test: typeof _serialization_schema.schema;
  }
}

const config = configure({
  apiKey: "xyz",
  nodes: [testNode],
});

function stubFetch(body: unknown) {
  const fetchMock = vi.fn((_url: string, _init: RequestInit) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function lastRequestUrl(fetchMock: ReturnType<typeof stubFetch>): string {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) throw new Error("fetch was not called");
  return call[0];
}

function lastRequestBody(fetchMock: ReturnType<typeof stubFetch>): unknown {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) throw new Error("fetch was not called");
  return JSON.parse(call[1].body as string);
}

function firstSearch(body: unknown): Record<string, unknown> {
  const searches = (body as { searches: Record<string, unknown>[] }).searches;
  const search = searches[0];
  if (!search) throw new Error("no searches in body");
  return search;
}

beforeAll(() => {
  setDefaultConfiguration({ apiKey: "xyz", nodes: [testNode] });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("array param serialization", () => {
  it("comma-joins highlight_full_fields in a per-collection search", async () => {
    const fetchMock = stubFetch({ hits: [] });

    await _serialization_schema.search(
      {
        q: "hello",
        query_by: ["content"],
        highlight_full_fields: ["content"],
      },
      config,
    );

    // The per-collection search path serializes params into the query string.
    const params = new URL(lastRequestUrl(fetchMock)).searchParams;
    expect(params.get("highlight_full_fields")).toBe("content");
    expect(params.get("query_by")).toBe("content");
  });

  it("comma-joins highlight_full_fields in a multi-search body", async () => {
    const fetchMock = stubFetch({ results: [{ hits: [] }] });

    await multisearch(
      {
        searches: [
          multisearchEntry({
            collection: "serialization_test",
            q: "hello",
            query_by: ["content"],
            highlight_full_fields: ["content"],
          }),
        ],
      },
      config,
    );

    const search = firstSearch(lastRequestBody(fetchMock));
    expect(search.highlight_full_fields).toBe("content");
    expect(search.query_by).toBe("content");
  });

  it("comma-joins multiple highlight_full_fields values", async () => {
    const fetchMock = stubFetch({ results: [{ hits: [] }] });

    await multisearch(
      {
        searches: [
          multisearchEntry({
            collection: "serialization_test",
            q: "hello",
            query_by: ["content", "title"],
            highlight_full_fields: ["content", "title"],
          }),
        ],
      },
      config,
    );

    const search = firstSearch(lastRequestBody(fetchMock));
    expect(search.highlight_full_fields).toBe("content,title");
  });
});
