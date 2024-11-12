import type { Alias, BaseAlias, GlobalAliases } from "@/alias";
import type { GlobalCollections } from "@/collection/base";
import type { Configuration } from "@/config";

import { makeRequest } from "@/http/fetch/request";

async function upsertAlias<
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

async function retrieveAlias<
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

async function deleteAlias<
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

export { upsertAlias, retrieveAlias, retrieveAllAliases, deleteAlias };
