import {
  clearDefaultConfiguration,
  configure,
  getConfiguration,
  getDefaultConfiguration,
  setDefaultConfiguration,
} from "@/config";
import { afterEach, describe, expect, it } from "vitest";

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

describe("default configuration management", () => {
  // Clean up after each test to avoid test interference
  afterEach(() => {
    clearDefaultConfiguration();
  });

  describe("setDefaultConfiguration", () => {
    it("should set a default configuration", () => {
      const config = configure({
        apiKey: "test-api-key",
        nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
        healthcheckIntervalSeconds: 30,
      });

      expect(() => setDefaultConfiguration(config)).not.toThrow();
    });

    it("should override previous default configuration", () => {
      const config1 = configure({
        apiKey: "api-key-1",
        nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
      });

      const config2 = configure({
        apiKey: "api-key-2",
        nodes: [{ host: "different-host", port: 8109, protocol: "https" }],
      });

      setDefaultConfiguration(config1);
      setDefaultConfiguration(config2);

      const defaultConfig = getDefaultConfiguration();
      expect(defaultConfig.apiKey).toBe("api-key-2");
    });
  });

  describe("getDefaultConfiguration", () => {
    it("should return the default configuration when set", () => {
      const config = configure({
        apiKey: "test-api-key",
        nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
        numRetries: 5,
      });

      setDefaultConfiguration(config);
      const defaultConfig = getDefaultConfiguration();

      expect(defaultConfig.apiKey).toBe("test-api-key");
      expect(defaultConfig.numRetries).toBe(5);
    });

    it("should throw error when no default configuration is set", () => {
      expect(() => getDefaultConfiguration()).toThrow(
        "No default configuration has been set. Please call `setDefaultConfiguration()` first or pass a config parameter to the method.",
      );
    });

    it("should process configuration through configure() function", () => {
      const config = configure({
        apiKey: "test-api-key",
        nodes: [
          { host: "localhost", port: 8108, protocol: "http" },
          { host: "localhost", port: 8109, protocol: "http" },
        ],
        // Not setting numRetries to test default calculation
      });

      setDefaultConfiguration(config);
      const defaultConfig = getDefaultConfiguration();

      // Should have calculated numRetries based on nodes length
      expect(defaultConfig.numRetries).toBe(3); // 2 nodes + 1
      expect(defaultConfig.healthcheckIntervalSeconds).toBe(60); // default value
      expect(defaultConfig.retryIntervalSeconds).toBe(1); // default value
    });
  });

  describe("getConfiguration", () => {
    it("should return provided config when given", () => {
      const defaultConfig = configure({
        apiKey: "default-key",
        nodes: [{ host: "default-host", port: 8108, protocol: "http" }],
      });

      const providedConfig = configure({
        apiKey: "provided-key",
        nodes: [{ host: "provided-host", port: 8109, protocol: "https" }],
      });

      setDefaultConfiguration(defaultConfig);
      const result = getConfiguration(providedConfig);

      expect(result.apiKey).toBe("provided-key");
    });

    it("should return default config when no config is provided", () => {
      const defaultConfig = configure({
        apiKey: "default-key",
        nodes: [{ host: "default-host", port: 8108, protocol: "http" }],
      });

      setDefaultConfiguration(defaultConfig);
      const result = getConfiguration();

      expect(result.apiKey).toBe("default-key");
    });

    it("should return default config when undefined is explicitly passed", () => {
      const defaultConfig = configure({
        apiKey: "default-key",
        nodes: [{ host: "default-host", port: 8108, protocol: "http" }],
      });

      setDefaultConfiguration(defaultConfig);
      const result = getConfiguration(undefined);

      expect(result.apiKey).toBe("default-key");
    });

    it("should throw error when no config provided and no default set", () => {
      expect(() => getConfiguration()).toThrow(
        "No default configuration has been set. Please call `setDefaultConfiguration()` first or pass a config parameter to the method.",
      );
    });

    it("should throw error when undefined provided and no default set", () => {
      expect(() => getConfiguration(undefined)).toThrow(
        "No default configuration has been set. Please call `setDefaultConfiguration()` first or pass a config parameter to the method.",
      );
    });
  });

  describe("clearDefaultConfiguration", () => {
    it("should clear the default configuration", () => {
      const config = configure({
        apiKey: "test-api-key",
        nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
      });

      setDefaultConfiguration(config);
      expect(() => getDefaultConfiguration()).not.toThrow();

      clearDefaultConfiguration();
      expect(() => getDefaultConfiguration()).toThrow();
    });

    it("should not throw when called with no default configuration set", () => {
      expect(() => clearDefaultConfiguration()).not.toThrow();
    });
  });

  describe("integration scenarios", () => {
    it("should handle multiple configurations in sequence", () => {
      const config1 = configure({
        apiKey: "key-1",
        nodes: [{ host: "host-1", port: 8108, protocol: "http" }],
      });

      const config2 = configure({
        apiKey: "key-2",
        nodes: [{ host: "host-2", port: 8109, protocol: "https" }],
      });

      // Set first config
      setDefaultConfiguration(config1);
      expect(getDefaultConfiguration().apiKey).toBe("key-1");

      // Override with second config
      setDefaultConfiguration(config2);
      expect(getDefaultConfiguration().apiKey).toBe("key-2");

      // Clear and verify error
      clearDefaultConfiguration();
      expect(() => getDefaultConfiguration()).toThrow();
    });

    it("should handle complex configuration with all options", () => {
      const config = configure({
        apiKey: "complex-key",
        nodes: [
          { host: "node1", port: 8108, protocol: "http" },
          { host: "node2", port: 8109, protocol: "https" },
        ],
        nearestNode: { url: "http://nearest-node" },
        randomizeNodes: true,
        connectionTimeoutSeconds: 10,
        timeoutSeconds: 30,
        healthcheckIntervalSeconds: 45,
        numRetries: 7,
        retryIntervalSeconds: 3,
        sendApiKeyAsQueryParam: true,
        additionalHeaders: {
          "Custom-Header": "custom-value",
          "Another-Header": "another-value",
        },
      });

      setDefaultConfiguration(config);
      const defaultConfig = getDefaultConfiguration();

      expect(defaultConfig.apiKey).toBe("complex-key");
      expect(defaultConfig.nodes).toHaveLength(2);
      expect(defaultConfig.nearestNode).toBeDefined();
      expect(defaultConfig.randomizeNodes).toBe(true);
      expect(defaultConfig.connectionTimeoutSeconds).toBe(10);
      expect(defaultConfig.timeoutSeconds).toBe(30);
      expect(defaultConfig.healthcheckIntervalSeconds).toBe(45);
      expect(defaultConfig.numRetries).toBe(7);
      expect(defaultConfig.retryIntervalSeconds).toBe(3);
      expect(defaultConfig.sendApiKeyAsQueryParam).toBe(true);
      expect(defaultConfig.additionalHeaders).toEqual({
        "Custom-Header": "custom-value",
        "Another-Header": "another-value",
      });
    });
  });
});
