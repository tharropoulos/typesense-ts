import type {
  AnalyticsRule,
  BaseEvent,
  EventType,
  GlobalAnalyticRules,
} from "@/analytics/rules";

type ExtractBaseEvents<Rule> =
  Rule extends AnalyticsRule<infer _Destination, infer _Type, infer Events> ?
    Events extends readonly (infer Event)[] ?
      Event extends BaseEvent<infer Name, infer Type> ?
        { type: Type; name: Name }
      : never
    : never
  : never;

type ValidEventCombos = {
  [K in keyof GlobalAnalyticRules]: ExtractBaseEvents<GlobalAnalyticRules[K]>;
}[keyof GlobalAnalyticRules];

type ValidEventNames<T extends EventType> = Extract<
  ValidEventCombos,
  { type: T }
>["name"];

interface AnalyticsEvent<
  Type extends ValidEventCombos["type"],
  Name extends ValidEventNames<Type> = ValidEventNames<Type>,
> {
  type: Type;
  name: Name;
  data: Type extends "search" ?
    {
      user_id: string;
      q: string;
    }
  : {
      user_id: string;
      doc_id: string;
      q?: string;
    };
}

export type { AnalyticsEvent, ValidEventCombos };
