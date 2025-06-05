import type { Aliases } from "@/alias";
import type { Collections, GetSchemaFromName } from "@/collection";
import type { Configuration } from "@/config";
import type { OmitDefaultSortingField } from "@/lib/utils";
import type { Override, OverrideCreate, OverrideOperations } from "@/override";

import { getConfiguration } from "@/config";
import { makeRequest } from "@/http/fetch/request";

interface OverrideResponse<
  CollectionName extends
    | Collections[keyof Collections]["name"]
    | Aliases[keyof Aliases]["name"],
> extends Override<
    string,
    CollectionName,
    OmitDefaultSortingField<
      GetSchemaFromName<
        CollectionName extends Aliases[keyof Aliases]["name"] ?
          Aliases[keyof Aliases]["collection_name"]
        : CollectionName
      >
    >,
    string,
    string,
    string[]
  > {
  id: string;
}

/**
 * Retrieve all overrides for a given collection
 */
async function retrieveAllOverrides<
  const CollectionName extends Collections[keyof Collections]["name"],
>(
  collection: CollectionName,
  config?: Configuration,
): Promise<{
  overrides: OverrideResponse<CollectionName>[];
}> {
  return makeRequest({
    endpoint: `/collections/${collection}/overrides`,
    config: getConfiguration(config),
    method: "GET",
  });
}

/**
 * Validate a new override for a given collection.
 */
function override<
  const OverrideName extends string,
  const CollectionName extends
    | Collections[keyof Collections]["name"]
    | Aliases[keyof Aliases]["name"],
  const Schema extends OmitDefaultSortingField<
    GetSchemaFromName<
      CollectionName extends Aliases[keyof Aliases]["name"] ?
        Aliases[keyof Aliases]["collection_name"]
      : CollectionName
    >
  >,
  const FilterBy extends string,
  const SortBy extends string,
  const Tags extends readonly string[],
>(
  name: OverrideName,
  override: OverrideCreate<CollectionName, Schema, FilterBy, SortBy, Tags>,
): OverrideOperations<
  OverrideName,
  CollectionName,
  Schema,
  FilterBy,
  SortBy,
  Tags
> {
  return {
    override: override as unknown as Override<
      OverrideName,
      CollectionName,
      Schema,
      FilterBy,
      SortBy,
      Tags
    >,

    retrieve(config?: Configuration) {
      return makeRequest({
        endpoint: `/collections/${this.override.collection}/overrides/${encodeURIComponent(name)}`,
        config: getConfiguration(config),
        method: "GET",
      });
    },

    upsert(config?: Configuration) {
      return makeRequest({
        body: override,
        endpoint: `/collections/${this.override.collection}/overrides/${encodeURIComponent(name)}`,
        config: getConfiguration(config),
        method: "PUT",
      });
    },

    delete(config?: Configuration) {
      return makeRequest({
        endpoint: `/collections/${this.override.collection}/overrides/${encodeURIComponent(name)}`,
        config: getConfiguration(config),
        method: "DELETE",
      });
    },
  };
}

export { override, retrieveAllOverrides };
