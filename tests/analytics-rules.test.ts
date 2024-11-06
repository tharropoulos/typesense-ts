import { analyticsRule } from "@/analytics/rules";
import { collection } from "@/collection/base";
import { configure } from "@/config";
import {
  createAnalyticsRule,
  deleteAnalyticsRule,
  retrieveAllAnalyticsRules,
  retrieveAnalyticsRule,
  upsertAnalyticsRule,
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
  name: "source",
});

const counterCollection = collection({
  fields: [
    {
      name: "counter",
      type: "int32",
    },
  ],
  name: "counter",
});

const removeRule = async () => {
  return await fetch("http://localhost:8108/analytics/rules/test-rule", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
  });
};

const no_hits_rule = analyticsRule({
  type: "nohits_queries",
  name: "no-hits-rule",
  params: {
    destination: {
      collection: "counter",
      counter_field: "counter",
    },
    source: {
      collections: ["source"],
    },
  },
});

const popular_rule = analyticsRule({
  type: "popular_queries",
  name: "popular-queries-rule",
  params: {
    destination: {
      collection: "counter",
      counter_field: "counter",
    },
    source: {
      collections: ["source"],
    },
  },
});

declare module "@/analytics/rules" {
  interface GlobalAnalyticRules {
    "no-hits-rule": typeof no_hits_rule;
    "popular-queries-rule": typeof popular_rule;
  }
}

declare module "@/collection/base" {
  interface GlobalCollections {
    source: typeof sourceCollection;
    counter: typeof counterCollection;
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

  const counter = await fetch("http://localhost:8108/collections", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
    body: JSON.stringify(counterCollection),
  });
  const source = await fetch("http://localhost:8108/collections", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
    body: JSON.stringify(sourceCollection),
  });

  expect(source.ok).toBe(true);

  expect(counter.ok).toBe(true);
});

afterAll(async () => {
  await fetch("http://localhost:8108/collections/source", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
  });

  await fetch("http://localhost:8108/collections/counter", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": "xyz",
    },
  });
});

describe("analytics rules", () => {
  describe("delete analytics rule", () => {
    beforeAll(async () => {
      await createAnalyticsRule(no_hits_rule, config);
    });

    it("should throw an error if the rule doesn't exist", async () => {
      await expect(async () => {
        // @ts-expect-error This should fail because the rule doesn't exist
        await deleteAnalyticsRule("non-existing-rule", config);
      }).rejects.toThrow("Rule not found.");
    });

    it("should delete an analytics rule", async () => {
      await deleteAnalyticsRule("no-hits-rule", config);

      await expect(async () => {
        await retrieveAnalyticsRule("no-hits-rule", config);
      }).rejects.toThrow("Rule not found.");
    });
  });

  describe("retrieve analytics rule", () => {
    beforeAll(async () => {
      await createAnalyticsRule(no_hits_rule, config);

      await createAnalyticsRule(popular_rule, config);
    });

    afterAll(async () => {
      await deleteAnalyticsRule("no-hits-rule", config);

      await deleteAnalyticsRule("popular-queries-rule", config);
    });

    it("should throw an error if the rule doesn't exist", async () => {
      await expect(async () => {
        // @ts-expect-error This should fail because the rule doesn't exist
        await retrieveAnalyticsRule("non-existing-rule", config);
      }).rejects.toThrow("Rule not found.");
    });

    it("should retrieve a single analytics rule", async () => {
      const rules = await retrieveAnalyticsRule("popular-queries-rule", config);

      expect(rules).toEqual({
        name: "popular-queries-rule",
        params: {
          destination: {
            collection: "counter",
          },
          expand_query: false,
          limit: 1000,
          source: {
            collections: ["source"],
          },
        },
        type: "popular_queries",
      });
    });

    it("should retrieve all analytics rules", async () => {
      const rules = await retrieveAllAnalyticsRules(config);

      expect(rules).toEqual({
        rules: [
          {
            name: "popular-queries-rule",
            params: {
              destination: {
                collection: "counter",
              },
              expand_query: false,
              limit: 1000,
              source: {
                collections: ["source"],
              },
            },
            type: "popular_queries",
          },
          {
            name: "no-hits-rule",
            params: {
              destination: {
                collection: "counter",
              },
              limit: 1000,
              source: {
                collections: ["source"],
              },
            },
            type: "nohits_queries",
          },
        ],
      });
    });
  });

  describe("create analytics rule", () => {
    it("shouldn't create a rule with events with non-unique names", async () => {
      await expect(async () => {
        await createAnalyticsRule(
          {
            type: "counter",
            name: "test-rule",
            params: {
              source: {
                collections: ["source"],
                events: [
                  {
                    name: "click",
                    type: "click",
                    weight: 1,
                  },
                  {
                    name: "click",
                    type: "click",
                    weight: 3,
                  },
                ],
              },
              destination: {
                collection: "source",
                counter_field: "counter",
              },
            },
          },
          config,
        );
      }).rejects.toThrow("Events must contain a unique name.");
    });

    it("shouldn't create a rule with a non-existing source collection", async () => {
      await expect(async () => {
        await createAnalyticsRule(
          {
            type: "counter",
            name: "test-rule",
            params: {
              source: {
                // @ts-expect-error This should fail because the collection doesn't exist
                collections: ["non-existing"],
              },
              destination: {
                collection: "counter",
              },
            },
          },
          config,
        );
      }).rejects.toThrow("Collection `non-existing` is not found");
    });

    it("shouldn't create a rule with a non-existing destination collection", async () => {
      await expect(async () => {
        await createAnalyticsRule(
          {
            type: "counter",
            name: "test-rule",
            params: {
              source: {
                collections: ["source"],
                events: [
                  {
                    name: "click",
                    type: "click",
                    weight: 1,
                  },
                ],
              },
              destination: {
                // @ts-expect-error This should fail because the collection doesn't exist
                collection: "non-existing",
              },
            },
          },
          config,
        );
      }).rejects.toThrow("Collection `non-existing` not found.");
    });

    describe("counter rules", () => {
      it("shouldn't create  a counter  rule with no events", async () => {
        await expect(async () => {
          await createAnalyticsRule(
            // @ts-expect-error This should fail because the events are missing
            {
              type: "counter",
              name: "test-rule",
              params: {
                source: {
                  collections: ["source"],
                },
                destination: {
                  collection: "source",
                },
              },
            },
            config,
          );
        }).rejects.toThrow("Bad or missing events");
      });

      it("shouldn't create a counter rule with bad events", async () => {
        await expect(async () => {
          await createAnalyticsRule(
            // @ts-expect-error This should fail because the event type is missing the weight
            {
              type: "counter",
              name: "test-rule",
              params: {
                source: {
                  collections: ["source"],
                  events: [
                    {
                      name: "click_2",
                      type: "click",
                    },
                    {
                      name: "click",
                      type: "click",
                    },
                  ],
                },
                destination: {
                  collection: "source",
                  counter_field: "counter",
                },
              },
            },
            config,
          );
        }).rejects.toThrow("Counter events must contain a weight value.");
      });

      it("shouldn't create a counter rule with events types other than click or conversion", async () => {
        await expect(async () => {
          await createAnalyticsRule(
            {
              name: "test-rule",
              type: "counter",
              params: {
                destination: {
                  collection: "counter",
                  counter_field: "counter",
                },
                source: {
                  collections: ["counter"],
                  events: [
                    // @ts-expect-error This should fail because the type is not click or conversion
                    {
                      name: "click",
                      type: "search",
                    },
                  ],
                },
              },
            },
            config,
          );
        }).rejects.toThrow("Events must contain a unique name.");
      });

      it("should create a counter rule", async () => {
        const rule = await createAnalyticsRule(
          {
            name: "test-rule",
            type: "counter",
            params: {
              destination: {
                collection: "counter",
                counter_field: "counter",
              },
              source: {
                collections: ["source"],
                events: [
                  {
                    name: "product_click",
                    type: "conversion",
                    weight: 1,
                  },
                  {
                    name: "product_conversion",
                    type: "conversion",
                    weight: 3,
                  },
                ],
              },
            },
          },
          config,
        );

        expect(rule).toEqual({
          name: "test-rule",
          type: "counter",
          params: {
            destination: {
              collection: "counter",
              counter_field: "counter",
            },
            source: {
              collections: ["source"],
              events: [
                {
                  name: "product_click",
                  type: "conversion",
                  weight: 1,
                },
                {
                  name: "product_conversion",
                  type: "conversion",
                  weight: 3,
                },
              ],
            },
          },
        });

        await removeRule();
      });
    });

    describe("log rule", () => {
      it("shouldn't create a log rule with no events", async () => {
        await expect(async () => {
          await createAnalyticsRule(
            {
              type: "log",
              name: "test-rule",
              // @ts-expect-error This should fail because the events are missing
              params: {
                source: {
                  collections: ["source"],
                },
              },
            },
            config,
          );
        }).rejects.toThrow("Bad or missing events");
      });

      it("should create a log rule", async () => {
        const rule = await createAnalyticsRule(
          {
            name: "test-rule",
            type: "log",
            params: {
              source: {
                collections: ["source"],
                events: [
                  {
                    name: "click",
                    type: "click",
                  },
                  {
                    name: "visit",
                    type: "visit",
                  },
                  {
                    name: "custom",
                    type: "custom",
                  },
                ],
              },
            },
          },
          config,
        );

        expect(rule).toEqual({
          name: "test-rule",
          type: "log",
          params: {
            source: {
              collections: ["source"],
              events: [
                {
                  name: "click",
                  type: "click",
                },
                {
                  name: "visit",
                  type: "visit",
                },
                {
                  name: "custom",
                  type: "custom",
                },
              ],
            },
          },
        });

        await removeRule();
      });

      it("should create a log rule with a destination collection", async () => {
        const result = await createAnalyticsRule(
          {
            type: "log",
            name: "test-rule",
            params: {
              destination: {
                collection: "counter",
                counter_field: "counter",
              },
              source: {
                collections: ["source"],
                events: [
                  {
                    name: "click",
                    type: "click",
                  },
                  {
                    name: "visit",
                    type: "visit",
                  },
                  {
                    name: "custom",
                    type: "custom",
                  },
                ],
              },
            },
          },
          config,
        );

        expect(result).toEqual({
          name: "test-rule",
          type: "log",
          params: {
            destination: {
              collection: "counter",
              counter_field: "counter",
            },
            source: {
              collections: ["source"],
              events: [
                {
                  name: "click",
                  type: "click",
                },
                {
                  name: "visit",
                  type: "visit",
                },
                {
                  name: "custom",
                  type: "custom",
                },
              ],
            },
          },
        });

        await removeRule();
      });
    });

    describe("popular queries rule", () => {
      it("should not create a popular queries rule without a destination collection", async () => {
        await expect(async () => {
          await createAnalyticsRule(
            {
              name: "test-rule",
              type: "popular_queries",
              // @ts-expect-error This should fail because the destination is missing
              params: {
                source: {
                  collections: ["source", "counter"],
                },
              },
            },
            config,
          );
        }).rejects.toThrow("Bad or missing destination");
      });

      it("should create a popular queries rule", async () => {
        const rule = await createAnalyticsRule(
          {
            name: "test-rule",
            type: "popular_queries",
            params: {
              source: {
                collections: ["source"],
              },
              destination: {
                collection: "counter",
              },
            },
          },
          config,
        );

        expect(rule).toEqual({
          name: "test-rule",
          type: "popular_queries",
          params: {
            source: {
              collections: ["source"],
            },
            destination: {
              collection: "counter",
            },
          },
        });

        await removeRule();
      });

      it("should create a popular queries rule with a counter field", async () => {
        const rule = await createAnalyticsRule(
          {
            name: "test-rule",
            type: "popular_queries",
            params: {
              source: {
                collections: ["source"],
              },
              destination: {
                collection: "counter",
                counter_field: "counter",
              },
            },
          },
          config,
        );

        expect(rule).toEqual({
          name: "test-rule",
          type: "popular_queries",
          params: {
            source: {
              collections: ["source"],
            },
            destination: {
              collection: "counter",
              counter_field: "counter",
            },
          },
        });

        await removeRule();
      });
    });

    describe("no hits queries", () => {
      it("should not create a no-hits-queries rule without a destination collection", async () => {
        await expect(async () => {
          await createAnalyticsRule(
            {
              name: "test-rule",
              type: "nohits_queries",
              // @ts-expect-error This should fail because the destination is missing
              params: {
                source: {
                  collections: ["source", "counter"],
                },
              },
            },
            config,
          );
        }).rejects.toThrow("Bad or missing destination");
      });

      it("should create a no-hits-queries rule without a counter field", async () => {
        const rule = await createAnalyticsRule(
          {
            name: "test-rule",
            type: "nohits_queries",
            params: {
              destination: {
                collection: "counter",
              },
              source: {
                collections: ["source", "counter"],
              },
            },
          },
          config,
        );

        await removeRule();

        expect(rule).toEqual({
          name: "test-rule",
          type: "nohits_queries",
          params: {
            destination: {
              collection: "counter",
            },
            source: {
              collections: ["source", "counter"],
            },
          },
        });
      });

      it("should create a no-hits-queries rule with a counter field", async () => {
        const rule = await createAnalyticsRule(
          {
            name: "test-rule",
            type: "nohits_queries",
            params: {
              destination: {
                collection: "counter",
                counter_field: "counter",
              },
              source: {
                collections: ["source", "counter"],
              },
            },
          },
          config,
        );

        expect(rule).toEqual({
          name: "test-rule",
          type: "nohits_queries",
          params: {
            destination: {
              collection: "counter",
              counter_field: "counter",
            },
            source: {
              collections: ["source", "counter"],
            },
          },
        });

        await removeRule();
      });
    });

    describe("upsert analytics rule", () => {
      it("should upsert a rule", async () => {
        const rule = await upsertAnalyticsRule(
          {
            name: "test-rule",
            type: "log",
            params: {
              source: {
                collections: ["source"],
                events: [
                  {
                    name: "click",
                    type: "click",
                  },
                  {
                    name: "visit",
                    type: "visit",
                  },
                  {
                    name: "custom",
                    type: "custom",
                  },
                ],
              },
            },
          },
          config,
        );

        expect(rule).toEqual({
          name: "test-rule",
          type: "log",
          params: {
            source: {
              collections: ["source"],
              events: [
                {
                  name: "click",
                  type: "click",
                },
                {
                  name: "visit",
                  type: "visit",
                },
                {
                  name: "custom",
                  type: "custom",
                },
              ],
            },
          },
        });

        await removeRule();
      });

      it("should update a rule", async () => {
        await createAnalyticsRule(
          {
            name: "test-rule",
            type: "counter",
            params: {
              source: {
                collections: ["source"],
                events: [
                  {
                    name: "click",
                    type: "click",
                    weight: 1,
                  },
                ],
              },
              destination: {
                collection: "source",
                counter_field: "counter",
              },
            },
          },
          config,
        );

        const rule = await upsertAnalyticsRule(
          {
            name: "test-rule",
            type: "log",
            params: {
              source: {
                collections: ["source"],
                events: [
                  {
                    name: "click",
                    type: "click",
                  },
                  {
                    name: "visit",
                    type: "visit",
                  },
                  {
                    name: "custom",
                    type: "custom",
                  },
                ],
              },
            },
          },
          config,
        );

        expect(rule).toEqual({
          name: "test-rule",
          type: "log",
          params: {
            source: {
              collections: ["source"],
              events: [
                {
                  name: "click",
                  type: "click",
                },
                {
                  name: "visit",
                  type: "visit",
                },
                {
                  name: "custom",
                  type: "custom",
                },
              ],
            },
          },
        });

        await removeRule();
      });
    });
  });
});
