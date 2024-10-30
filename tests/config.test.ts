import { configure } from "@/config";
import { describe, expect, it } from "vitest";

describe("configure", () => {
  it("should use provided numRetries when valid", () => {
    const result = configure({
      apiKey: "xyz",
      numRetries: 3,
      nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
    });

    expect(result.numRetries).toBe(3);
  });

  it("should calculate numRetries based on nodes length when not provided", () => {
    const result = configure({
      nodes: [
        { host: "localhost", port: 8108, protocol: "http" },
        { host: "localhost", port: 8109, protocol: "http" },
      ],
      apiKey: "123",
    });

    expect(result.numRetries).toBe(3); // 2 nodes + 1
  });

  it("should not add extra retry when nearestNode is provided", () => {
    const result = configure({
      nodes: [
        { host: "localhost", port: 8108, protocol: "http" },
        { host: "localhost", port: 8109, protocol: "http" },
      ],
      nearestNode: { url: "http://localhost" },
      apiKey: "123",
    });

    expect(result.numRetries).toBe(2); // 2 nodes + 0 (because nearestNode is true)
  });

  it("should use default healthcheckIntervalSeconds when not provided", () => {
    const result = configure({
      nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
      apiKey: "123",
    });

    expect(result.healthcheckIntervalSeconds).toBe(60);
  });

  it("should use provided healthcheckIntervalSeconds when specified", () => {
    const result = configure({
      nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
      apiKey: "123",
      healthcheckIntervalSeconds: 30,
    });

    expect(result.healthcheckIntervalSeconds).toBe(30);
  });

  it("should use default retryIntervalSeconds when not provided", () => {
    const result = configure({
      nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
      apiKey: "123",
    });

    expect(result.retryIntervalSeconds).toBe(1);
  });

  it("should use provided retryIntervalSeconds when specified", () => {
    const result = configure({
      nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
      apiKey: "123",
      retryIntervalSeconds: 2,
    });

    expect(result.retryIntervalSeconds).toBe(2);
  });

  it("should preserve all other configuration properties", () => {
    const result = configure({
      nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
      apiKey: "123",
      additionalHeaders: { "Custom-Header": "value" },
    });

    expect(result.apiKey).toBe("123");
    expect(result.additionalHeaders).toEqual({ "Custom-Header": "value" });
  });

  it("should handle single node configuration", () => {
    const result = configure({
      nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
      apiKey: "123",
    });

    expect(result.nodes).toHaveLength(1);
    expect(result.numRetries).toBe(2); // 1 node + 1
  });

  it("should handle multiple nodes configuration", () => {
    const result = configure({
      nodes: [
        { host: "test.com", port: 8108, protocol: "http" },
        { host: "test.com", port: 8108, protocol: "http" },
        { host: "test.com", port: 8108, protocol: "http" },
      ],
      apiKey: "123",
    });

    expect(result.nodes).toHaveLength(3);
    expect(result.numRetries).toBe(4); // 3 nodes + 1
  });
});
