import type { Collections, GetSchemaFromName } from "@/collection";
import type { Configuration } from "@/config";
import type { OmitDefaultSortingField } from "@/lib/utils";
import type { Override, OverrideCreate, OverrideOperations } from "@/override";

import { getConfiguration } from "@/config";
import { makeRequest } from "@/http/fetch/request";

export function override<
  const OverrideName extends string,
  const CollectionName extends Collections[keyof Collections]["name"],
  const Schema extends OmitDefaultSortingField<
    GetSchemaFromName<CollectionName>
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
