import type { NearestNode, TsNode } from "@/node";

import { makeRequest } from "@/http/fetch/request";
import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

describe("makeRequest", () => {
  const createNode = (index: number, isHealthy: boolean): TsNode => ({
    isHealthy,
    index,
    lastAccessTimestamp: Date.now(),
    url: `http://node-${index}.example.com`,
  });

  const createNearestNode = (isHealthy: boolean): NearestNode => ({
    isHealthy,
    index: "nearest",
    lastAccessTimestamp: Date.now(),
    url: "http://nearest.example.com",
  });

  beforeEach(() => {
    fetchMocker.resetMocks();
  });

  it("should successfully make a request to first healthy node", async () => {
    const nodes = [createNode(0, true)];

    fetchMocker.mockResponseOnce(JSON.stringify({ data: "success" }));

    const result = await makeRequest({
      method: "POST",
      config: {
        nodes,
        apiKey: "test-key",
        healthcheckIntervalSeconds: 1,
        retryIntervalSeconds: 0,
        numRetries: 3,
      },
      body: { test: "data" },
      params: new URLSearchParams({ q: "query" }),
    });

    expect(result).toStrictEqual({ data: "success" });
    const url = new URL(fetchMocker.requests()[0]!.url);
    expect(url.origin).toBe("http://node-0.example.com");
    expect(url.searchParams.get("q")).toBe("query");

    expect(fetchMocker.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({ test: "data" }),
    );
  });

  it("should retry with next node on 500 error", async () => {
    const nodes = [createNode(0, true), createNode(1, true)];

    fetchMocker
      .mockResponseOnce("Server Error", { status: 500 })
      .mockResponseOnce(JSON.stringify({ data: "success" }));

    const result = await makeRequest({
      method: "POST",
      config: {
        nodes,
        apiKey: "test-key",
        healthcheckIntervalSeconds: 1,
        retryIntervalSeconds: 0, // Set to 0 for faster tests
        numRetries: 3,
      },
      body: { test: "data" },
      params: new URLSearchParams({ q: "query" }),
    });

    expect(result).toStrictEqual({ data: "success" });

    const urls: [URL, URL] = [
      new URL(fetchMocker.requests()[0]!.url),
      new URL(fetchMocker.requests()[1]!.url),
    ];

    expect(urls[0].origin).toBe("http://node-0.example.com");
    expect(urls[0].searchParams.get("q")).toBe("query");
    expect(urls[1].origin).toBe("http://node-1.example.com");
    expect(urls[1].searchParams.get("q")).toBe("query");
  });

  it("should throw RequestError immediately on 4xx error", async () => {
    const nodes = [createNode(0, true)];

    fetchMocker.mockResponseOnce("Bad Request", { status: 400 });

    await expect(
      makeRequest({
        method: "POST",
        config: {
          nodes,
          apiKey: "test-key",
          healthcheckIntervalSeconds: 1,
          retryIntervalSeconds: 0,
          numRetries: 3,
        },
        body: { test: "data" },
        params: new URLSearchParams({ q: "query" }),
      }),
    ).rejects.toThrow("Bad Request");

    expect(fetchMocker.requests()).toHaveLength(1);
  });

  it("should throw after maximum retries", async () => {
    const nodes = [
      createNode(0, true),
      createNode(1, true),
      createNode(2, true),
    ];

    fetchMocker
      .mockResponseOnce("Error 1", { status: 500 })
      .mockResponseOnce("Error 2", { status: 500 })
      .mockResponseOnce("Error 3", { status: 500 });

    await expect(
      makeRequest({
        method: "POST",
        config: {
          nodes,
          apiKey: "test-key",
          healthcheckIntervalSeconds: 1,
          retryIntervalSeconds: 0.1,
          numRetries: 2,
        },
        body: { test: "data" },
        params: new URLSearchParams({ q: "query" }),
      }),
    ).rejects.toThrow("Error 3");

    expect(fetchMocker.requests()).toHaveLength(3);

    const urls: [URL, URL, URL] = [
      new URL(fetchMocker.requests()[0]!.url),
      new URL(fetchMocker.requests()[1]!.url),
      new URL(fetchMocker.requests()[2]!.url),
    ];

    expect(urls[0].origin).toBe("http://node-0.example.com");
    expect(urls[0].searchParams.get("q")).toBe("query");

    expect(urls[1].origin).toBe("http://node-1.example.com");
    expect(urls[1].searchParams.get("q")).toBe("query");

    expect(urls[2].origin).toBe("http://node-2.example.com");
    expect(urls[2].searchParams.get("q")).toBe("query");
  });

  it("should handle network errors", async () => {
    const nodes = [createNode(0, true)];

    fetchMocker.mockRejectOnce(new Error("Network error"));

    await expect(
      makeRequest({
        method: "POST",
        config: {
          nodes,
          apiKey: "test-key",
          healthcheckIntervalSeconds: 1,
          retryIntervalSeconds: 0,
          numRetries: 0,
        },
        body: { test: "data" },
        params: new URLSearchParams({ q: "query" }),
      }),
    ).rejects.toThrow("Network error");
  });

  it("should use nearest node when healthy", async () => {
    const nodes = [createNode(0, false)];
    const nearestNode = createNearestNode(true);
    const config = {
      nodes,
      nearestNode,
      apiKey: "test-key",
      healthcheckIntervalSeconds: 1,
      retryIntervalSeconds: 0,
      numRetries: 3,
    };

    fetchMocker.mockResponseOnce(JSON.stringify({ data: "success" }));

    await makeRequest({
      method: "POST",
      config,
      body: { test: "data" },
      params: new URLSearchParams({ q: "query" }),
    });

    const url = new URL(fetchMocker.requests()[0]!.url);
    expect(url.origin).toBe("http://nearest.example.com");
    expect(url.searchParams.get("q")).toBe("query");
  });
});
