import { analyticsRule } from "@/analytics/rules";
import { collection } from "@/collection/base";
import { configure } from "@/config";
import {
  createAnalyticsRule,
  createEvent,
  deleteAnalyticsRule,
} from "@/http/fetch/analytics";
import { upAll } from "docker-compose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const isCi = process.env.CI;

const sourceCollection = collection({
  fields: [
    {
      name: "title",
      type: "string",
    },
    {
      name: "counter",
      type: "int32",
    },
  ],
  name: "event_source",
});

const counterCollection = collection({
  fields: [
    {
      name: "counter",
      type: "int32",
    },
  ],
  name: "event_counter",
});

const counterRule = analyticsRule({
  name: "counter-rule",
  type: "counter",
  params: {
    destination: {
      collection: "event_counter",
      counter_field: "counter",
    },
    source: {
      collections: ["event_source"],
      events: [
        {
          name: "event_conversion",
          type: "conversion",
          weight: 3,
        },
      ],
    },
  },
});

declare module "@/collection/base" {
  interface GlobalCollections {
    eventSource: typeof sourceCollection;
    eventCounter: typeof counterCollection;
  }
}

declare module "@/analytics/rules" {
  interface GlobalAnalyticRules {
    counter: typeof counterRule;
  }
}
const config = configure({
  apiKey: "xyz",
  nodes: [{ url: "http://localhost:8108" }],
});

beforeAll(async () => {
  if (!isCi) {
    await upAll({ cwd: __dirname, log: true });
  }

  const event_counter = await fetch("http://localhost:8108/collections", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
    body: JSON.stringify(counterCollection),
  });
  const event_source = await fetch("http://localhost:8108/collections", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
    body: JSON.stringify(sourceCollection),
  });

  expect(event_source.ok).toBe(true);

  expect(event_counter.ok).toBe(true);

  await expect(createAnalyticsRule(counterRule, config)).resolves.toBeTruthy();
});

afterAll(async () => {
  await fetch("http://localhost:8108/collections/event_source", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
  });

  await fetch("http://localhost:8108/collections/event_counter", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
  });
  await expect(
    deleteAnalyticsRule("counter-rule", config),
  ).resolves.toBeTruthy();
});

describe("analytics events", () => {
  describe("createAnalyticsEvent", () => {
    it("shouldn't create an event for a non-existing name", async () => {
      await expect(
        createEvent(
          {
            // @ts-expect-error - invalid event name
            name: "non-existing-event",
            type: "conversion",
            data: {
              doc_id: "123",
              user_id: "456",
            },
          },
          config,
        ),
      ).rejects.toThrow(
        "No analytics rule defined for event name non-existing-event",
      );
    });
    it("shouldn't create an event for a mismatched name-type", async () => {
      await expect(
        createEvent(
          {
            name: "event_conversion",
            // @ts-expect-error - invalid event type
            type: "click",
            data: {
              doc_id: "123",
              user_id: "456",
              q: "test",
            },
          },
          config,
        ),
      ).rejects.toThrow("event_type mismatch in analytic rules.");
    });
  });
  it("should create an event for a valid name-type", async () => {
    await expect(
      createEvent(
        {
          name: "event_conversion",
          type: "conversion",
          data: {
            doc_id: "123",
            user_id: "456",
            q: "test",
          },
        },
        config,
      ),
    ).resolves.toMatchObject({ ok: true });
  });
});
