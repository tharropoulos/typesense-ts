import type { CounterFields, GlobalCollections } from "@/collection/base";

/**
 * Helper type to check if an array of objects has unique 'name' properties
 * @template T - Array type containing objects with a 'name' property
 * @returns {boolean} - True if all names are unique, false otherwise
 */
type _HasUniqueNames<T extends readonly { name: string }[]> =
  T extends (
    readonly [
      infer First extends { name: string },
      ...infer Rest extends { name: string }[],
    ]
  ) ?
    First["name"] extends Rest[number]["name"] ?
      false
    : _HasUniqueNames<Rest>
  : true;

/**
 * Valid event types for analytics rules
 */
type EventType = "click" | "conversion" | "visit" | "custom" | "search";

/**
 * Valid analytics rule types
 */
type RuleTypes = "popular_queries" | "nohits_queries" | "counter" | "log";

/**
 * Base interface for all event types
 * @template Name - String literal type for the event name
 * @template Type - Specific event type extending EventType
 */
interface BaseEvent<Name extends string, Type extends EventType> {
  name: Name;
  type: Type;
  log_to_store?: boolean;
}

/**
 * Search event type used for query-related rules
 * @template Name - String literal type for the event name
 * @template Type - Must be "search"
 */
type SearchEvent<
  Name extends string,
  Type extends "search" = "search",
> = BaseEvent<Name, Type>;

/**
 * Counter event type used for tracking numeric metrics
 * @template Name - String literal type for the event name
 * @template Type - Must be either "click" or "conversion"
 * @template Weight - Numeric type for the event weight
 */
type CounterEvent<
  Name extends string,
  Type extends "click" | "conversion",
  Weight extends number,
> = BaseEvent<Name, Type> & { weight: Weight };

/**
 * Log event type used for tracking user actions
 * @template Name - String literal type for the event name
 * @template Type - Must be "click", "visit", or "custom"
 */
type LogEvent<
  Name extends string,
  Type extends "click" | "visit" | "custom",
> = BaseEvent<Name, Type>;

/**
 * Base interface for all rule types
 * @template RuleType - Specific rule type extending RuleTypes
 */
interface BaseRule<RuleType extends RuleTypes> {
  type: RuleType;
}

/**
 * Rule type for tracking popular search queries
 * @template Destination - Collection where results will be stored
 * @template Events - Array of SearchEvent types
 */
interface PopularQueriesRule<
  Destination extends GlobalCollections[keyof GlobalCollections]["name"],
  Events extends SearchEvent<string>[],
> extends BaseRule<"popular_queries"> {
  params: {
    limit?: number;
    expand_query?: boolean;
    enable_auto_aggregation?: boolean;
    source: {
      collections: GlobalCollections[keyof GlobalCollections]["name"][];
      events?: Events;
    };
    destination: {
      collection: Destination;
      counter_field?: CounterFields<
        GlobalCollections[KeyFromName<Destination>]["fields"]
      >;
    };
  };
}

type CollectionNameToKey = {
  [K in keyof GlobalCollections]: GlobalCollections[K]["name"] extends string ?
    GlobalCollections[K]["name"]
  : never;
};

type KeyFromName<T extends CollectionNameToKey[keyof CollectionNameToKey]> = {
  [K in keyof CollectionNameToKey]: CollectionNameToKey[K] extends T ? K
  : never;
}[keyof CollectionNameToKey];

/**
 * Rule type for tracking search queries with no results
 * @template Destination - Collection where results will be stored
 * @template Events - Array of SearchEvent types
 */
interface NoHitsQueryRule<
  Destination extends GlobalCollections[keyof GlobalCollections]["name"],
  Events extends SearchEvent<string>[],
> extends BaseRule<"nohits_queries"> {
  params: {
    limit?: number;
    expand_query?: boolean;
    enable_auto_aggregation?: boolean;
    source: {
      collections: GlobalCollections[keyof GlobalCollections]["name"][];
      events?: Events;
    };
    destination: {
      collection: Destination;
      counter_field?: CounterFields<
        GlobalCollections[KeyFromName<Destination>]["fields"]
      >;
    };
  };
}

/**
 * Rule type for tracking numeric metrics
 * @template Destination - Collection where results will be stored
 * @template Events - Array of CounterEvent types
 */
interface CounterRule<
  Destination extends GlobalCollections[keyof GlobalCollections]["name"],
  Events extends CounterEvent<string, "click" | "conversion", number>[],
> extends BaseRule<"counter"> {
  params: {
    source: {
      collections: GlobalCollections[keyof GlobalCollections]["name"][];
      events: Events;
    };
    destination: {
      collection: Destination;
      counter_field?: CounterFields<
        GlobalCollections[KeyFromName<Destination>]["fields"]
      >;
    };
  };
}

/**
 * Rule type for logging events
 * @template Events - Array of LogEvent types
 * @template Destination - Optional collection where results will be stored
 */
interface LogRule<
  Events extends LogEvent<string, "click" | "visit" | "custom">[],
  Destination extends
    GlobalCollections[keyof GlobalCollections]["name"] = GlobalCollections[keyof GlobalCollections]["name"],
> extends BaseRule<"log"> {
  params: {
    source: {
      collections: GlobalCollections[keyof GlobalCollections]["name"][];
      events: Events;
    };
    destination?: {
      collection: Destination;
      counter_field?: CounterFields<
        GlobalCollections[KeyFromName<Destination>]["fields"]
      >;
    };
  };
}

/**
 * Union type for all possible analytics rules
 * @template Destination - Collection where results will be stored
 * @template RuleType - Type of rule being created
 * @template Events - Array of event configurations
 */
type AnalyticsRule<
  Destination extends
    GlobalCollections[keyof GlobalCollections]["name"] = GlobalCollections[keyof GlobalCollections]["name"],
  RuleType extends RuleTypes = RuleTypes,
  Events extends { name: string; type: EventType }[] = never,
> =
  RuleType extends "log" ?
    LogRule<{
      [K in keyof Events]: Events[K] extends (
        {
          type: "click" | "visit" | "custom";
        }
      ) ?
        Events[K] & LogEvent<Events[K]["name"], Events[K]["type"]>
      : never;
    }>
  : RuleType extends "counter" ?
    CounterRule<
      Destination,
      {
        [K in keyof Events]: Events[K] extends (
          {
            type: "click" | "conversion";
          }
        ) ?
          Events[K] & CounterEvent<Events[K]["name"], Events[K]["type"], number>
        : never;
      }
    >
  : RuleType extends "nohits_queries" ?
    NoHitsQueryRule<
      Destination,
      {
        [K in keyof Events]: Events[K] extends { type: "search" } ?
          Events[K] & SearchEvent<Events[K]["name"]>
        : never;
      }
    >
  : PopularQueriesRule<
      Destination,
      {
        [K in keyof Events]: Events[K] extends { type: "search" } ?
          Events[K] & SearchEvent<Events[K]["name"]>
        : never;
      }
    >;

/**
 * Helper function to define an analytics rule with proper type inference
 */
function analyticsRule<
  const Name extends string,
  const Destination extends GlobalCollections[keyof GlobalCollections]["name"],
  const RuleType extends RuleTypes,
  const Events extends { name: string; type: EventType }[],
>(
  rule: AnalyticsRule<Destination, RuleType, Events> & { name: Name },
): AnalyticsRule<Destination, RuleType, Events> & { name: Name } {
  return rule;
}

/**
 * Interface for global analytics rule configurations
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GlobalAnalyticRules {}

export type {
  GlobalAnalyticRules,
  AnalyticsRule,
  EventType,
  RuleTypes,
  PopularQueriesRule,
  NoHitsQueryRule,
  CounterRule,
  LogRule,
};

export { analyticsRule };
