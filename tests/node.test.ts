/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { describe, expect, it } from "vitest";

import type {
  NearestNode,
  Node,
  NodeConfiguration,
  UrlString,
} from "../src/config/node";
import {
  getNextNode,
  handleNodeType,
  initializeNodes,
  nodeDueForHealthcheck,
  setNodeHealth,
} from "../src/config/node";

describe("type tests", () => {
  describe("NodeConfiguration", () => {
    it("should not let a url be defined when host, port, or protocol are defined", () => {
      const _host: NodeConfiguration = {
        host: "localhost",
        // @ts-expect-error This is erroring as expected
        url: "http://localhost:3000",
      };

      const _port: NodeConfiguration = {
        port: 3000,
        // @ts-expect-error This is erroring as expected
        url: "http://localhost:3000",
      };

      const _protocol: NodeConfiguration = {
        protocol: "http",
        // @ts-expect-error This is erroring as expected
        url: "http://localhost:3000",
      };

      const _path: NodeConfiguration = {
        path: "/api",
        // @ts-expect-error This is erroring as expected
        url: "http://localhost:3000",
      };
    });
    describe("when the node configuration is of type 'host'", () => {
      it("should only let a path be prefixed with a slash", () => {
        const _config: NodeConfiguration = {
          path: "/api",
          host: "localhost",
          port: 3000,
          protocol: "http",
        };
        const _error: NodeConfiguration = {
          // @ts-expect-error This is erroring as expected
          path: "api",
          host: "localhost",
          port: 3000,
          protocol: "http",
        };
      });
      it("should only let a protocol be http or https", () => {
        const _http: NodeConfiguration = {
          host: "localhost",
          port: 3000,
          protocol: "http",
        };
        const _https: NodeConfiguration = {
          host: "localhost",
          port: 3000,
          protocol: "https",
        };
        const _error: NodeConfiguration = {
          host: "localhost",
          port: 3000,
          // @ts-expect-error This is erroring as expected
          protocol: "ftp",
        };
      });
    });
  });
  describe("UrlString", () => {
    it("should only let a protocol be http or https", () => {
      const _http: UrlString = "http://localhost:3000";
      const _https: UrlString = "https://localhost:3000";
      // @ts-expect-error This is erroring as expected
      const _error: UrlString = "ftp://localhost:3000";
    });
    it("should only let a path be prefixed with a slash", () => {
      const _config: UrlString = "http://localhost:3000/a";
      // @ts-expect-error This is erroring as expected
      const _error: UrlString = "http://localhost:3000api";
    });
    it("should only let ports be numbers", () => {
      const _config: UrlString = "http://localhost:3000";
      // @ts-expect-error This is erroring as expected
      const _error: UrlString = "http://localhost:port";
    });
    it("should only let domains be strings", () => {
      const _config: UrlString = "http://localhost";
      // @ts-expect-error This is erroring as expected
      const _error: UrlString = "http://23:3000";
    });
    it("should not end on an empty path", () => {
      const _config: UrlString = "http://localhost:3000";
      // @ts-expect-error This is erroring as expected
      const _error: UrlString = "http://localhost:3000/";
    });
    it("should let an empty path", () => {
      const _port: UrlString = "http://localhost:3000";
      const _empty: UrlString = "http://localhost";
    });
  });
});
describe("function tests", () => {
  describe("initializeNodes", () => {
    describe("when initializing with url configurations", () => {
      it("should correctly initialize an array of nodes with url configurations", () => {
        const nodeConfigs: NodeConfiguration[] = [
          { url: "http://localhost:3000" },
          { url: "http://localhost:3001/api" },
          { url: "https://example.com:8080" },
        ];

        const result = initializeNodes({ nodes: nodeConfigs });

        expect(result.nodes).toHaveLength(3);
        expect(result.nearestNode).toBeUndefined();

        // Check each node's properties
        result.nodes.forEach((node, index) => {
          expect(node).toMatchObject({
            isHealthy: true,
            index,
            url: nodeConfigs[index]!.url,
          });
          expect(node.lastAccessTimestamp).toBeCloseTo(Date.now(), -2);
        });
      });

      it("should correctly initialize with a nearest node using url configuration", () => {
        const nodeConfigs: NodeConfiguration[] = [
          { url: "http://localhost:3000" },
          { url: "http://localhost:3001" },
        ];
        const nearestNodeConfig: NodeConfiguration = {
          url: "http://localhost:8080",
        };

        const result = initializeNodes({
          nodes: nodeConfigs,
          nearestNode: nearestNodeConfig,
        });

        expect(result.nodes).toHaveLength(2);
        expect(result.nearestNode).toBeDefined();
        expect(result.nearestNode).toMatchObject({
          isHealthy: true,
          index: "nearest",
          url: nearestNodeConfig.url,
        });
        expect(result.nearestNode?.lastAccessTimestamp).toBeCloseTo(
          Date.now(),
          -2,
        );
      });
    });

    describe("when initializing with host configurations", () => {
      it("should correctly initialize an array of nodes with host configurations", () => {
        const nodeConfigs: NodeConfiguration[] = [
          {
            host: "localhost",
            port: 3000,
            protocol: "http",
          },
          {
            host: "localhost",
            port: 3001,
            protocol: "https",
            path: "/api",
          },
        ];

        const result = initializeNodes({ nodes: nodeConfigs });

        expect(result.nodes).toHaveLength(2);
        expect(result.nodes[0]).toMatchObject({
          isHealthy: true,
          index: 0,
          url: "http://localhost:3000",
        });
        expect(result.nodes[1]).toMatchObject({
          isHealthy: true,
          index: 1,
          url: "https://localhost:3001/api",
        });
        result.nodes.forEach((node) => {
          expect(node.lastAccessTimestamp).toBeCloseTo(Date.now(), -2);
        });
      });

      it("should correctly initialize with a nearest node using host configuration", () => {
        const nodeConfigs: NodeConfiguration[] = [
          { host: "localhost", port: 3000, protocol: "http" },
        ];
        const nearestNodeConfig: NodeConfiguration = {
          host: "localhost",
          port: 8080,
          protocol: "https",
          path: "/api",
        };

        const result = initializeNodes({
          nodes: nodeConfigs,
          nearestNode: nearestNodeConfig,
        });

        expect(result.nodes).toHaveLength(1);
        expect(result.nearestNode).toMatchObject({
          isHealthy: true,
          index: "nearest",
          url: "https://localhost:8080/api",
        });
        expect(result.nearestNode?.lastAccessTimestamp).toBeCloseTo(
          Date.now(),
          -2,
        );
      });
    });

    describe("edge cases", () => {
      it("should handle empty nodes array", () => {
        const result = initializeNodes({ nodes: [] });
        expect(result.nodes).toEqual([]);
        expect(result.nearestNode).toBeUndefined();
      });

      it("should handle mixed url and host configurations", () => {
        const nodeConfigs: [NodeConfiguration, NodeConfiguration] = [
          { url: "http://localhost:3000" },
          {
            host: "localhost",
            port: 3001,
            protocol: "https",
            path: "/api",
          },
        ];

        const result = initializeNodes({ nodes: nodeConfigs });

        expect(result.nodes).toHaveLength(2);
        expect(result.nodes[0]!.url).toBe("http://localhost:3000");
        expect(result.nodes[1]!.url).toBe("https://localhost:3001/api");
      });

      it("should preserve additional properties in configurations", () => {
        const nodeConfigs: (NodeConfiguration & { weight: number })[] = [
          { url: "http://localhost:3000", weight: 10 },
          {
            host: "localhost",
            port: 3001,
            protocol: "http",
            weight: 20,
          },
        ];

        const result = initializeNodes({ nodes: nodeConfigs });

        expect(result.nodes[0]).toHaveProperty("weight", 10);
        expect(result.nodes[1]).toHaveProperty("weight", 20);
      });
    });
  });
  describe("nodeDueForHealthcheck", () => {
    it("should return true if the last access timestamp is over the interval", () => {
      const node: Node = {
        isHealthy: true,
        index: 0,
        lastAccessTimestamp: Date.now() - 1200,
        url: "http://localhost:3000",
      };

      const healthcheckIntervalSeconds = 1;
      expect(nodeDueForHealthcheck(node, healthcheckIntervalSeconds)).toBe(
        true,
      );
    });
    it("should return false if the last access timestamp is under the interval", () => {
      const node: Node = {
        isHealthy: true,
        index: 0,
        lastAccessTimestamp: Date.now(),
        url: "http://localhost:3000",
      };

      const healthcheckIntervalSeconds = 1;
      expect(nodeDueForHealthcheck(node, healthcheckIntervalSeconds)).toBe(
        false,
      );
    });
  });
  describe("setNodeHealth", () => {
    const createNode = (index: number, isHealthy: boolean): Node => ({
      isHealthy,
      index,
      lastAccessTimestamp: Date.now() - 5000, // Set initial timestamp 5 seconds in the past
      url: `http://localhost:${3000 + index}`,
    });

    it("should update node health status to healthy", () => {
      const node = createNode(0, false);
      const updatedNode = setNodeHealth(node, true);

      expect(updatedNode.isHealthy).toBe(true);
      expect(updatedNode).toBe(node); // Should return same node instance
    });

    it("should update node health status to unhealthy", () => {
      const node = createNode(0, true);
      const updatedNode = setNodeHealth(node, false);

      expect(updatedNode.isHealthy).toBe(false);
      expect(updatedNode).toBe(node); // Should return same node instance
    });

    it("should update lastAccessTimestamp to current time", () => {
      const node = createNode(0, true);
      const beforeUpdate = Date.now();
      const updatedNode = setNodeHealth(node, false);
      const afterUpdate = Date.now();

      expect(updatedNode.lastAccessTimestamp).toBeGreaterThanOrEqual(
        beforeUpdate,
      );
      expect(updatedNode.lastAccessTimestamp).toBeLessThanOrEqual(afterUpdate);
    });

    it("should not modify other node properties", () => {
      const node = createNode(0, true);
      const originalIndex = node.index;
      const originalUrl = node.url;

      const updatedNode = setNodeHealth(node, false);

      expect(updatedNode.index).toBe(originalIndex);
      expect(updatedNode.url).toBe(originalUrl);
    });
  });
  describe("handleNodeType", () => {
    it("should not override the original object, but copy it", () => {
      const config: NodeConfiguration = {
        url: "https://example.com:3000/api",
      };

      const result = handleNodeType(config);

      expect(result).not.toBe(config);
      expect(result.url).toEqual(config.url);
    });
    it("should preserve any additional properties passed", () => {
      const config: NodeConfiguration & { weight: number } = {
        url: "https://example.com:3000/api",
        weight: 10,
      };

      const result = handleNodeType(config);

      expect(result).toMatchObject({
        url: config.url,
        weight: config.weight,
      });
    });
    describe("when the node configuration is of type 'host'", () => {
      it("should format the url correctly without a path", () => {
        const config: NodeConfiguration = {
          host: "localhost",
          port: 3000,
          protocol: "http",
        };

        const result = handleNodeType(config);

        expect(result.url).toBe("http://localhost:3000");
      });
      it("should format the url correctly with a path", () => {
        const config: NodeConfiguration = {
          host: "localhost",
          port: 3000,
          protocol: "http",
          path: "/api",
        };

        const result = handleNodeType(config);

        expect(result.url).toBe("http://localhost:3000/api");
      });
    });
    describe("when the node configuration is of type 'url'", () => {
      it("should not modify the url", () => {
        const config: NodeConfiguration = {
          url: "https://example.com:3000/api",
        };

        const result = handleNodeType(config);

        expect(result.url).toBe(config.url);
      });
    });
  });
  describe("getNextNode", () => {
    const createNode = (index: number, isHealthy: boolean): Node => ({
      isHealthy,
      index,
      lastAccessTimestamp: Date.now(),
      url: `http://localhost:${3000 + index}`,
    });

    const createNearestNode = (isHealthy: boolean): NearestNode => ({
      isHealthy,
      index: "nearest",
      lastAccessTimestamp: Date.now(),
      url: "http://localhost:3000",
    });

    it("should throw error when nodes array is empty", () => {
      expect(() =>
        getNextNode({
          nodes: [],
          healthcheckIntervalSeconds: 1,
        }),
      ).toThrow("No nodes available");
    });

    it("should return nearest node if it is healthy", () => {
      const nodes = [
        createNode(0, false),
        createNode(1, false),
        createNode(2, false),
      ];
      const nearestNode = createNearestNode(true);

      const result = getNextNode({
        nodes,
        nearestNode,
        healthcheckIntervalSeconds: 1,
        currentIndex: 2,
      });

      expect(result.node).toBe(nearestNode);
      expect(result.nextIndex).toBe(2);
    });

    it("should return nearest node if it is due for healthcheck", () => {
      const nodes = [
        createNode(0, false),
        createNode(1, false),
        createNode(2, false),
      ];
      const nearestNode = createNearestNode(false);
      nearestNode.lastAccessTimestamp = Date.now() - 2000; // 2 seconds ago

      const result = getNextNode({
        nodes,
        nearestNode,
        healthcheckIntervalSeconds: 1,
        currentIndex: 2,
      });

      expect(result.node).toBe(nearestNode);
      expect(result.nextIndex).toBe(2);
    });

    it("should find next healthy node in round robin order", () => {
      const nodes = [
        createNode(0, false),
        createNode(1, true), // This should be selected
        createNode(2, false),
      ];

      const result = getNextNode({
        nodes,
        healthcheckIntervalSeconds: 1,
        currentIndex: 0,
      });

      expect(result.node).toBe(nodes[1]);
      expect(result.nextIndex).toBe(1);
    });

    it("should find next node due for healthcheck in round robin order", () => {
      const nodes: [Node, Node, Node] = [
        createNode(0, false),
        createNode(1, false),
        createNode(2, false),
      ];
      nodes[1].lastAccessTimestamp = Date.now() - 2000; // Node at index 1 is due for healthcheck

      const result = getNextNode({
        nodes,
        healthcheckIntervalSeconds: 1,
        currentIndex: 0,
      });

      expect(result.node).toBe(nodes[1]);
      expect(result.nextIndex).toBe(1);
    });

    it("should return next node in rotation if no healthy or due for healthcheck nodes found", () => {
      const nodes = [
        createNode(0, false),
        createNode(1, false),
        createNode(2, false),
      ];
      // All nodes were accessed recently
      nodes.forEach((node) => {
        node.lastAccessTimestamp = Date.now();
      });

      const result = getNextNode({
        nodes,
        healthcheckIntervalSeconds: 1,
        currentIndex: 0,
      });

      expect(result.node).toBe(nodes[1]); // Should return next node (index 1)
      expect(result.nextIndex).toBe(1);
    });

    it("should wrap around to beginning of array when reaching the end", () => {
      const nodes = [
        createNode(0, false),
        createNode(1, false),
        createNode(2, false),
      ];

      const result = getNextNode({
        nodes,
        healthcheckIntervalSeconds: 1,
        currentIndex: 2, // Last index
      });

      expect(result.node).toBe(nodes[0]); // Should wrap to first node
      expect(result.nextIndex).toBe(0);
    });
    it("should throw when encountering missing node during round-robin check", () => {
      // Create array with undefined value to simulate missing node
      const nodes = [
        createNode(0, false),
        undefined as unknown as Node,
        createNode(2, false),
      ];

      expect(() =>
        getNextNode({
          nodes,
          healthcheckIntervalSeconds: 1,
          currentIndex: 0,
        }),
      ).toThrow("Missing node at index 1");
    });

    it("should throw when next node in rotation is missing", () => {
      // Create array with undefined value at the next index position
      const nodes = [
        createNode(0, false),
        undefined as unknown as Node,
        createNode(2, false),
      ];

      expect(() =>
        getNextNode({
          nodes,
          healthcheckIntervalSeconds: 1,
          currentIndex: 0,
        }),
      ).toThrow("Missing node at index 1");
    });

    it("should throw when array contains null node", () => {
      // Create array with null value
      const nodes = [
        createNode(0, false),
        null as unknown as Node,
        createNode(2, false),
      ];

      expect(() =>
        getNextNode({
          nodes,
          healthcheckIntervalSeconds: 1,
          currentIndex: 0,
        }),
      ).toThrow("Missing node at index 1");
    });

    // Test that sparse arrays are handled correctly
    it("should throw when encountering sparse array", () => {
      // Create sparse array
      const nodes = Array(3) as Node[];
      nodes[0] = createNode(0, false);
      nodes[2] = createNode(2, false);
      // nodes[1] is undefined

      expect(() =>
        getNextNode({
          nodes,
          healthcheckIntervalSeconds: 1,
          currentIndex: 0,
        }),
      ).toThrow("Missing node at index 1");
    });

    // Test array with holes
    it("should throw when array has holes", () => {
      // Create array with hole using delete
      const nodes = [
        createNode(0, false),
        createNode(1, false),
        createNode(2, false),
      ];
      // eslint-disable-next-line @typescript-eslint/no-array-delete
      delete nodes[1];

      expect(() =>
        getNextNode({
          nodes,
          healthcheckIntervalSeconds: 1,
          currentIndex: 0,
        }),
      ).toThrow("Missing node at index 1");
    });
    it("should throw when fallback next node is missing", () => {
      // Create nodes where:
      // 1. No nodes are healthy
      // 2. No nodes are due for healthcheck
      // 3. The next node in rotation is missing
      const nodes = [
        createNode(0, false),
        undefined as unknown as Node, // This will be our nextIndex when starting from index 0
        createNode(2, false),
      ] as Node[];

      // Set all valid nodes to have recent timestamps
      nodes.forEach((node) => {
        if (node) {
          node.lastAccessTimestamp = Date.now();
        }
      });

      expect(() =>
        getNextNode({
          nodes,
          healthcheckIntervalSeconds: 1,
          currentIndex: 0,
        }),
      ).toThrow("Missing node at index 1");
    });

    it("should throw when fallback next node is missing even with healthy nodes before it", () => {
      // Create an array where a healthy node exists, but it's after the missing next node
      const nodes = [
        createNode(0, false),
        undefined as unknown as Node, // This will be our nextIndex
        createNode(2, true), // This is healthy but comes after the missing node
      ] as Node[];

      expect(() =>
        getNextNode({
          nodes,
          healthcheckIntervalSeconds: 1,
          currentIndex: 0,
        }),
      ).toThrow("Missing node at index 1");
    });
  });
});
