import type { Alias, Aliases, AliasOperations, BaseAlias } from "@/alias";
import type { Collections } from "@/collection/base";
import type { Configuration } from "@/config";

import { getConfiguration } from "@/config";
import { makeRequest } from "@/http/fetch/request";

async function _upsertAlias<
  const Name extends string,
  const CollectionName extends Collections[keyof Collections]["name"],
>(
  alias: Alias<Name, CollectionName>,
  config?: Configuration,
): Promise<Alias<Name, CollectionName>> {
  return makeRequest({
    body: alias,
    endpoint: `/aliases/${encodeURIComponent(alias.name)}`,
    config: getConfiguration(config),
    method: "PUT",
  });
}

async function _retrieveAlias<
  const Name extends Aliases[keyof Aliases]["name"],
  const CollectionName extends
    Collections[keyof Collections]["name"] = Collections[keyof Collections]["name"],
>(name: Name, config?: Configuration): Promise<Alias<Name, CollectionName>> {
  return await makeRequest({
    endpoint: `/aliases/${encodeURIComponent(name)}`,
    config: getConfiguration(config),
    method: "GET",
  });
}

async function retrieveAllAliases(
  config?: Configuration,
): Promise<{ aliases: BaseAlias[] }> {
  return await makeRequest({
    endpoint: "/aliases",
    config: getConfiguration(config),
    method: "GET",
  });
}

async function _deleteAlias<
  const Name extends Aliases[keyof Aliases]["name"],
  const CollectionName extends
    Collections[keyof Collections]["name"] = Collections[keyof Collections]["name"],
>(name: Name, config?: Configuration): Promise<Alias<Name, CollectionName>> {
  return makeRequest({
    endpoint: `/aliases/${encodeURIComponent(name)}`,
    config: getConfiguration(config),
    method: "DELETE",
  });
}

function alias<
  const Name extends string,
  const CollectionName extends Collections[keyof Collections]["name"],
>(alias: Alias<Name, CollectionName>): AliasOperations<Name, CollectionName> {
  return {
    alias,

    async retrieve(config?: Configuration) {
      return await makeRequest({
        endpoint: `/aliases/${encodeURIComponent(alias.name)}`,
        config: getConfiguration(config),
        method: "GET",
      });
    },

    async delete(config?: Configuration) {
      return await makeRequest({
        endpoint: `/aliases/${encodeURIComponent(alias.name)}`,
        config: getConfiguration(config),
        method: "DELETE",
      });
    },

    async upsert(config?: Configuration) {
      return await makeRequest({
        body: alias,
        endpoint: `/aliases/${encodeURIComponent(alias.name)}`,
        config: getConfiguration(config),
        method: "PUT",
      });
    },
  };
}

export { alias, retrieveAllAliases };
