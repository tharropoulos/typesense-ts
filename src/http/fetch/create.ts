import type { Configuration } from "@/config";
import type {
  EntityToOptionsMap,
  EntityToReturnMap,
  EntityToTypeMap,
  GetEntity,
} from "@/entities";

import { getEntityType } from "@/entities";
import { makeRequest } from "@/http/fetch/request";

function create<const T extends EntityToTypeMap[keyof EntityToTypeMap]>(
  entity: T,
  config: Configuration,
  options?: EntityToOptionsMap[GetEntity<T>],
): Promise<EntityToReturnMap<T>[GetEntity<T>]> {
  const entityType = getEntityType(entity);
  switch (entityType) {
    case "collection": {
      const params = new URLSearchParams(options);
      return makeRequest({
        body: entity,
        endpoint: "/collections",
        config,
        method: "POST",
        params,
      });
    }
  }
}

export { create };
