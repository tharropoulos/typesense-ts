import type { AnalyticsEvent, ValidEventCombos } from "@/analytics/events";
import type {
  AnalyticsRule,
  AnalyticsRuleOperations,
  Destinations,
  EventType,
  RuleTypes,
} from "@/analytics/rules";
import type { Configuration } from "@/config";

import { getConfiguration } from "@/config";
import { makeRequest } from "@/http/fetch/request";

async function sendEvent<Type extends ValidEventCombos["type"]>(
  event: AnalyticsEvent<Type>,
  config?: Configuration,
): Promise<{ ok: boolean }> {
  return await makeRequest({
    body: event,
    endpoint: "/analytics/events",
    config: getConfiguration(config),
    method: "POST",
  });
}

function analyticsRule<
  const Name extends string,
  const Destination extends Destinations,
  const RuleType extends RuleTypes,
  const Events extends { name: string; type: EventType }[],
>(
  rule: AnalyticsRule<Destination, RuleType, Events> & { name: Name },
): AnalyticsRuleOperations<Name, Destination, RuleType, Events> {
  return {
    rule,

    retrieve: async (config?: Configuration) => {
      return await makeRequest({
        endpoint: `/analytics/rules/${rule.name}`,
        config: getConfiguration(config),
        method: "GET",
      });
    },

    create: async (config?: Configuration) => {
      return await makeRequest({
        body: rule,
        endpoint: `/analytics/rules`,
        config: getConfiguration(config),
        method: "POST",
      });
    },

    delete: async (config?: Configuration) => {
      return await makeRequest({
        endpoint: `/analytics/rules/${rule.name}`,
        config: getConfiguration(config),
        method: "DELETE",
      });
    },

    upsert: async (config?: Configuration) => {
      return await makeRequest({
        endpoint: `/analytics/rules/${rule.name}`,
        config: getConfiguration(config),
        method: "PUT",
        body: rule,
      });
    },
  };
}

async function retrieveAllAnalyticsRules(
  config?: Configuration,
): Promise<{ rules: AnalyticsRule & { name: string }[] }> {
  return await makeRequest({
    endpoint: "/analytics/rules",
    config: getConfiguration(config),
    method: "GET",
  });
}
export { sendEvent, retrieveAllAnalyticsRules, analyticsRule };
