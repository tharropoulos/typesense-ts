import type {
  AnalyticsRule,
  EventType,
  GlobalAnalyticRules,
  RuleTypes,
} from "@/analytics/rules";
import type { GlobalCollections } from "@/collection/base";
import type { Configuration } from "@/config";

import { makeRequest } from "@/http/fetch/request";

async function createAnalyticsRule<
  const Name extends string,
  const Destination extends GlobalCollections[keyof GlobalCollections]["name"],
  const RuleType extends RuleTypes,
  const Events extends { name: string; type: EventType }[],
>(
  rule: AnalyticsRule<Destination, RuleType, Events> & { name: Name },
  config: Configuration,
): Promise<AnalyticsRule<Destination, RuleType, Events> & { name: Name }> {
  return makeRequest({
    body: rule,
    endpoint: "/analytics/rules",
    config,
    method: "POST",
  });
}

async function upsertAnalyticsRule<
  const Name extends string,
  const Destination extends GlobalCollections[keyof GlobalCollections]["name"],
  const RuleType extends RuleTypes,
  const Events extends { name: string; type: EventType }[],
>(
  rule: AnalyticsRule<Destination, RuleType, Events> & { name: Name },
  config: Configuration,
): Promise<AnalyticsRule<Destination, RuleType, Events> & { name: Name }> {
  return await makeRequest({
    body: rule,
    endpoint: `/analytics/rules/${rule.name}`,
    config,
    method: "PUT",
  });
}

async function retrieveAnalyticsRule<
  Name extends GlobalAnalyticRules[keyof GlobalAnalyticRules]["name"],
>(name: Name, config: Configuration): Promise<AnalyticsRule & { name: Name }> {
  return await makeRequest({
    endpoint: `/analytics/rules/${encodeURI(name)}`,
    config,
    method: "GET",
  });
}

async function retrieveAllAnalyticsRules(
  config: Configuration,
): Promise<{ rules: AnalyticsRule & { name: string }[] }> {
  return await makeRequest({
    endpoint: "/analytics/rules",
    config,
    method: "GET",
  });
}

async function deleteAnalyticsRule<
  Name extends GlobalAnalyticRules[keyof GlobalAnalyticRules]["name"],
>(name: Name, config: Configuration): Promise<{ name: Name }> {
  return await makeRequest({
    endpoint: `/analytics/rules/${encodeURIComponent(name)}`,
    config,
    method: "DELETE",
  });
}

export {
  upsertAnalyticsRule,
  createAnalyticsRule,
  retrieveAnalyticsRule,
  retrieveAllAnalyticsRules,
  deleteAnalyticsRule,
};
