type Protocol = "http" | "https";
type Domain = `${string}.${string}` | `localhost`;
type Port = `:${number}`;
type Path = `/${string}${string}`;

type UrlString = `${Protocol}://${Domain}${Port | ""}${Path | ""}`;

type NodeConfiguration =
  | {
      url: UrlString;
      host?: never;
      port?: never;
      protocol?: never;
      path?: never;
    }
  | {
      host: Domain;
      port: number;
      protocol: "http" | "https";
      path?: Path;
      url?: never;
    };

interface BaseNode {
  isHealthy: boolean;
  lastAccessTimestamp: number;
  url: string;
}

interface Node extends BaseNode {
  index: number;
}

interface NearestNode extends BaseNode {
  index: "nearest";
}

function nodeDueForHealthcheck(
  node: BaseNode,
  healthcheckIntervalSeconds: number,
): boolean {
  return (
    Date.now() - node.lastAccessTimestamp > healthcheckIntervalSeconds * 1000
  );
}

function setNodeHealth<T extends BaseNode>(node: T, isHealthy: boolean): T {
  node.isHealthy = isHealthy;
  node.lastAccessTimestamp = Date.now();
  return node;
}

function getNextNode({
  nodes,
  nearestNode,
  healthcheckIntervalSeconds,
  currentIndex = 0,
}: {
  nodes: BaseNode[];
  nearestNode?: NearestNode;
  healthcheckIntervalSeconds: number;
  currentIndex?: number;
}): { node: BaseNode; nextIndex: number } {
  if (!nodes.length) {
    throw new Error("No nodes available");
  }

  // Return nearest node if it's healthy or due for healthcheck
  if (
    nearestNode &&
    (nearestNode.isHealthy === true ||
      nodeDueForHealthcheck(nearestNode, healthcheckIntervalSeconds))
  ) {
    return { node: nearestNode, nextIndex: currentIndex };
  }

  const nextIndex = (currentIndex + 1) % nodes.length;

  // Create array of indices starting from currentIndex
  const rotatedIndices = Array.from(
    { length: nodes.length },
    (_, i) => (currentIndex + i) % nodes.length,
  );

  // Find first healthy or due-for-healthcheck node
  const healthyNode = rotatedIndices
    .map((index) => {
      const node = nodes[index];
      if (!node) {
        throw new Error(`Missing node at index ${index}`);
      }
      return node;
    })
    .find(
      (node) =>
        node.isHealthy ||
        nodeDueForHealthcheck(node, healthcheckIntervalSeconds),
    );

  if (healthyNode) {
    return { node: healthyNode, nextIndex };
  }

  // If no healthy nodes found, return next node in rotation
  const nextNode = nodes[nextIndex];
  if (!nextNode) {
    throw new Error(`Missing node at index ${nextIndex}`);
  }

  return { node: nextNode, nextIndex };
}

function handleNodeType<T extends NodeConfiguration>(
  node: T,
): Omit<T, keyof NodeConfiguration> & BaseNode {
  if (node.url !== undefined) {
    return {
      ...node,
      isHealthy: true,
      lastAccessTimestamp: Date.now(),
      url: node.url,
    };
  }

  const { host, port, protocol, path } = node;
  return {
    ...node,
    isHealthy: true,
    lastAccessTimestamp: Date.now(),
    url: path
      ? `${protocol}://${host}:${port}${path}`
      : `${protocol}://${host}:${port}`,
  };
}

function initializeNodes({
  nodes,
  nearestNode,
}: {
  nodes: NodeConfiguration[];
  nearestNode?: NodeConfiguration;
}): {
  nodes: Node[];
  nearestNode?: NearestNode;
} {
  const initializedNodes = nodes.map((node, index) => {
    const handledNode = handleNodeType(node);
    return {
      ...handledNode,
      index,
    };
  });

  if (!nearestNode) {
    return { nodes: initializedNodes };
  }

  return {
    nodes: initializedNodes,
    nearestNode: {
      ...handleNodeType(nearestNode),
      index: "nearest",
    },
  };
}

export type { NodeConfiguration, Node, NearestNode, UrlString };

export {
  nodeDueForHealthcheck,
  setNodeHealth,
  getNextNode,
  initializeNodes,
  handleNodeType,
};
