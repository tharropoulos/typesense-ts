/* eslint-disable @typescript-eslint/consistent-indexed-object-style */
import type { InferNativeType } from "@/collection/base";
import type {
  BuildNested,
  DotLevels,
  FindBreakingPoint,
  GenerateSchemaType,
  HighlightV2,
  Hit,
  InferNestedStructure,
  InferSchemaType,
} from "@/search";

import { collection } from "@/collection/base";
import { search } from "@/search";

const _usersSchema = collection({
  name: "users",
  fields: [
    { name: "a", type: "object" },
    { name: "a.b", type: "object" },
    { name: "a.b.c", type: "object" },
    { name: "a.b.c.d", type: "string[]" },
    { name: "a.c", type: "string" },
    { name: "a.c.c", type: "object" },
    { name: "a.c.c.d", type: "string[]" },
    { name: "ab", type: "string" },
  ],
  enable_nested_fields: true,
});

type Cc = DotLevels<"a.b.c.d">;
type X = FindBreakingPoint<typeof _usersSchema.fields, Cc>;
type Xx = InferNestedStructure<typeof _usersSchema.fields, "a.b.c">;
type Gtx = InferSchemaType<typeof _usersSchema.fields>;

const c: Gtx = {
  ab: "a",
  a: {
    b: {
      c: {
        d: ["a"],
      },
    },
    c: "a",
  },
  "a.c.c": {
    d: ["a"],
  },
};

const test = search(_usersSchema, {
  q: "anguish",
  query_by: ["a.b.c.d", "a"],
});

type D = Hit<
  typeof _usersSchema.fields,
  typeof test.query_by,
  typeof test.highlight_fields,
  typeof test.include_fields,
  typeof test.exclude_fields,
  typeof test.q
>;
const _d: D = {
  document: {
    id: "1",
  },
  highlight: {
    a: {
      b: {
        c: {
          d: [
            {
              matched_tokens: ["anguish"],
              snippet: "anguish",
            },
          ],
        },
      },
      c: {
        c: {
          d: [],
        },
      },
    },
  },
};
type A = GenerateSchemaType<typeof _usersSchema.fields>;

const _a: A = {
  a: {},
};
