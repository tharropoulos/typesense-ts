import type { Alias, AliasOperations, BaseAlias, GlobalAliases } from "@/alias";
import type { GlobalCollections } from "@/collection/base";
import type { Configuration } from "@/config";

import { makeRequest } from "@/http/fetch/request";

async function _upsertAlias<
  const Name extends string,
  const CollectionName extends
    GlobalCollections[keyof GlobalCollections]["name"],
>(
  alias: Alias<Name, CollectionName>,
  config: Configuration,
): Promise<Alias<Name, CollectionName>> {
  return makeRequest({
    body: alias,
    endpoint: `/aliases/${encodeURIComponent(alias.name)}`,
    config,
    method: "PUT",
  });
}

async function _retrieveAlias<
  const Name extends GlobalAliases[keyof GlobalAliases]["name"],
  const CollectionName extends
    GlobalCollections[keyof GlobalCollections]["name"] = GlobalCollections[keyof GlobalCollections]["name"],
>(name: Name, config: Configuration): Promise<Alias<Name, CollectionName>> {
  return await makeRequest({
    endpoint: `/aliases/${encodeURIComponent(name)}`,
    config,
    method: "GET",
  });
}

async function retrieveAllAliases(
  config: Configuration,
): Promise<{ aliases: BaseAlias[] }> {
  return await makeRequest({
    endpoint: "/aliases",
    config,
    method: "GET",
  });
}

async function _deleteAlias<
  const Name extends GlobalAliases[keyof GlobalAliases]["name"],
  const CollectionName extends
    GlobalCollections[keyof GlobalCollections]["name"] = GlobalCollections[keyof GlobalCollections]["name"],
>(name: Name, config: Configuration): Promise<Alias<Name, CollectionName>> {
  return makeRequest({
    endpoint: `/aliases/${encodeURIComponent(name)}`,
    config,
    method: "DELETE",
  });
}

function alias<
  const Name extends string,
  const CollectionName extends
    GlobalCollections[keyof GlobalCollections]["name"],
>(
  alias: Alias<Name, CollectionName>,
  config: Configuration,
): AliasOperations<Name, CollectionName> {
  return {
    alias,

    async retrieve() {
      return await makeRequest({
        endpoint: `/aliases/${encodeURIComponent(alias.name)}`,
        config,
        method: "GET",
      });
    },

    async delete() {
      return await makeRequest({
        endpoint: `/aliases/${encodeURIComponent(alias.name)}`,
        config,
        method: "DELETE",
      });
    },

    async upsert() {
      return await makeRequest({
        body: alias,
        endpoint: `/aliases/${encodeURIComponent(alias.name)}`,
        config,
        method: "PUT",
      });
    },
  };
}

export { alias, retrieveAllAliases };
