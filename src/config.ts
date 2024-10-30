import type { NearestNode, NodeConfiguration, TsNode } from "@/node";

import { initializeNodes } from "@/node";

interface BaseConfiguration {
  apiKey: string;
  randomizeNodes?: boolean;
  connectionTimeoutSeconds?: number;
  timeoutSeconds?: number;
  healthcheckIntervalSeconds?: number;
  numRetries?: number;
  retryIntervalSeconds?: number;
  sendApiKeyAsQueryParam?: boolean;
  additionalHeaders?: Record<string, string>;
}

type MakeKeysRequired<T, K extends keyof T> = T & {
  [P in K]-?: T[P];
};

interface CreateConfiguration extends BaseConfiguration {
  nodes: NodeConfiguration[];
  nearestNode?: NodeConfiguration;
}

interface Configuration
  extends MakeKeysRequired<
    BaseConfiguration,
    "healthcheckIntervalSeconds" | "numRetries" | "retryIntervalSeconds"
  > {
  nodes: TsNode[];
  nearestNode?: NearestNode;
}

function configure(config: CreateConfiguration): Configuration {
  const { nodes, nearestNode } = initializeNodes({
    nodes: config.nodes,
    nearestNode: config.nearestNode,
  });

  const numRetries =
    config.numRetries && config.numRetries >= 0
      ? config.numRetries
      : nodes.length + (nearestNode ? 0 : 1);

  const healthcheckIntervalSeconds = config.healthcheckIntervalSeconds ?? 60;
  const retryIntervalSeconds = config.retryIntervalSeconds ?? 1;

  return {
    ...config,
    nodes,
    nearestNode,
    numRetries,
    healthcheckIntervalSeconds,
    retryIntervalSeconds,
  };
}

export type { Configuration };

export { configure };
