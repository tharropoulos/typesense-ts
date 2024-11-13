import type {
  CheckSquareBrackets,
  FilterClause,
  IsNextTokenValid,
  ParseEval,
  ReadToken,
  Tokenizer,
} from "@/lexer/eval";
import type { NumToken } from "@/lexer/token";

import { collection } from "@/collection/base";
import { describe, expectTypeOf, it } from "vitest";

const _usersSchema = collection({
  name: "users",
  fields: [
    { type: "string", optional: false, name: "id" },
    { type: "string", optional: false, name: "name" },
    { type: "int32", optional: false, name: "age", sort: true },
    { type: "string", optional: true, name: "email" },
  ],
  default_sorting_field: "age",
});

const _postsSchema = collection({
  name: "posts",
  fields: [
    { type: "string", optional: false, name: "id" },
    { type: "string", optional: false, name: "title" },
    { type: "string", optional: false, name: "content" },
    {
      type: "string",
      optional: false,
      name: "author",
      reference: "users.id",
    },
  ],
});

declare module "@/collection/base" {
  interface GlobalCollections {
    users: typeof _usersSchema;
    posts: typeof _postsSchema;
  }
}

describe("ReadToken tests", () => {
  it("should read a left square bracket", () => {
    expectTypeOf<ReadToken<"[age:=20">>().toEqualTypeOf<["[", "age:=20"]>();
  });

  it("should read a right square bracket", () => {
    expectTypeOf<ReadToken<"]age:=20">>().toEqualTypeOf<["]", "age:=20"]>();
  });

  it("should read a colon", () => {
    expectTypeOf<ReadToken<":age:=20">>().toEqualTypeOf<[":", "age:=20"]>();
  });

  it("should read a comma", () => {
    expectTypeOf<ReadToken<",age:=20">>().toEqualTypeOf<[",", "age:=20"]>();
  });

  it("should read a filter clause", () => {
    expectTypeOf<ReadToken<"(age:=20):30">>().toEqualTypeOf<
      [FilterClause<"age:=20", true>, "30"]
    >();
  });

  it("should read a number", () => {
    expectTypeOf<ReadToken<"30:test">>().toEqualTypeOf<
      [NumToken<"30">, ":test"]
    >();
  });
});

describe("Tokenizer tests", () => {
  it("should tokenize a valid input string with single filter", () => {
    expectTypeOf<Tokenizer<"age:=20">>().toEqualTypeOf<
      [FilterClause<"age:=20", false>]
    >();
  });

  it("should tokenize a valid input string with range filters", () => {
    expectTypeOf<Tokenizer<"[(age:>20):30, (age:<40):20]">>().toEqualTypeOf<
      [
        "[",
        FilterClause<"age:>20", true>,
        NumToken<"30">,
        ",",
        FilterClause<"age:<40", true>,
        NumToken<"20">,
        "]",
      ]
    >();
  });

  it("should handle whitespace correctly", () => {
    expectTypeOf<Tokenizer<"[ (age:=20) : 30 ]">>().toEqualTypeOf<
      ["[", FilterClause<"age:=20", true>, NumToken<"30">, "]"]
    >();
  });
});

describe("IsValid tests", () => {
  it("should validate a single filter clause", () => {
    expectTypeOf<
      IsNextTokenValid<FilterClause<"age:=20", false>, typeof _usersSchema, []>
    >().toEqualTypeOf<true>();
  });

  it("should validate a range filter clause", () => {
    expectTypeOf<
      IsNextTokenValid<
        FilterClause<"age:>=20", true>,
        typeof _usersSchema,
        [NumToken<"30">]
      >
    >().toEqualTypeOf<true>();
  });

  it("should validate a colon followed by a number", () => {
    expectTypeOf<
      IsNextTokenValid<":", typeof _usersSchema, [NumToken<"30">]>
    >().toEqualTypeOf<true>();
  });

  it("should validate a comma followed by a filter", () => {
    expectTypeOf<
      IsNextTokenValid<
        ",",
        typeof _usersSchema,
        [FilterClause<"age:<=40", true>]
      >
    >().toEqualTypeOf<true>();
  });

  it("should invalidate incorrect tokens after [", () => {
    expectTypeOf<
      IsNextTokenValid<"[", typeof _usersSchema, [NumToken<"30">]>
    >().toEqualTypeOf<"Invalid token after `[`, expected filter">();
  });

  it("should invalidate incorrect tokens after filter", () => {
    expectTypeOf<
      IsNextTokenValid<
        FilterClause<"age:=20", true>,
        typeof _usersSchema,
        ["["]
      >
    >().toEqualTypeOf<"Invalid token after filter, expected a number">();
  });

  it("should invalidate incorrect tokens after colon", () => {
    expectTypeOf<
      IsNextTokenValid<":", typeof _usersSchema, ["["]>
    >().toEqualTypeOf<"Invalid token after `:`, expected number">();
  });

  it("should invalidate incorrect tokens after comma", () => {
    expectTypeOf<
      IsNextTokenValid<",", typeof _usersSchema, [NumToken<"30">]>
    >().toEqualTypeOf<"Invalid token after `,`, expected filter">();
  });

  it("should invalidate incorrect tokens after number", () => {
    expectTypeOf<
      IsNextTokenValid<NumToken<"30">, typeof _usersSchema, [":"]>
    >().toEqualTypeOf<"Invalid token after number, expected `,` or `]`">();
  });
});

describe("CheckSquareBrackets tests", () => {
  it("should validate balanced square brackets", () => {
    expectTypeOf<
      CheckSquareBrackets<
        ["[", FilterClause<"age:=20", true>, ":", NumToken<"30">, "]"]
      >
    >().toEqualTypeOf<true>();
  });

  it("should invalidate unbalanced square brackets (more opening)", () => {
    expectTypeOf<
      CheckSquareBrackets<
        ["[", "[", FilterClause<"age:=20", true>, ":", NumToken<"30">, "]"]
      >
    >().toEqualTypeOf<false>();
  });

  it("should invalidate unbalanced square brackets (more closing)", () => {
    expectTypeOf<
      CheckSquareBrackets<
        ["[", FilterClause<"age:=20", true>, ":", NumToken<"30">, "]", "]"]
      >
    >().toEqualTypeOf<false>();
  });

  it("should validate empty array", () => {
    expectTypeOf<CheckSquareBrackets<[]>>().toEqualTypeOf<true>();
  });
});

describe("ParseEval tests", () => {
  it("should parse a valid single filter", () => {
    expectTypeOf<
      ParseEval<"age:=20", typeof _usersSchema>
    >().toEqualTypeOf<true>();
  });

  it("should parse a valid range filter", () => {
    expectTypeOf<
      ParseEval<"[(age:>=20):30]", typeof _usersSchema>
    >().toEqualTypeOf<true>();
  });

  it("should parse multiple valid range filters", () => {
    expectTypeOf<
      ParseEval<"[(age:>=20):30, (age:<=40):20]", typeof _usersSchema>
    >().toEqualTypeOf<true>();
  });

  it("should fail for unbalanced square brackets", () => {
    expectTypeOf<
      ParseEval<"[(age:>=20):30", typeof _usersSchema>
    >().toEqualTypeOf<"Invalid token after number, expected `,` or `]`">();
  });

  it("should fail for invalid filter clause", () => {
    expectTypeOf<
      ParseEval<"[(invalid:=20):30]", typeof _usersSchema>
    >().toEqualTypeOf<"[Error on filter]: Invalid token sequence: Literal Token `invalid` followed by `:=`">();
  });

  it("should fail for invalid token sequence", () => {
    expectTypeOf<
      ParseEval<"[(age:=20)30]", typeof _usersSchema>
    >().toEqualTypeOf<"[Error on filter]: Invalid token sequence: `)` followed by num token">();
  });

  it("should parse complex nested filters", () => {
    expectTypeOf<
      ParseEval<
        "[(age:>=20 && name:`John`):30, (email:`*@gmail.com` || age:<=40):20]",
        typeof _usersSchema
      >
    >().toEqualTypeOf<true>();
  });

  it("should parse filters with references", () => {
    expectTypeOf<
      ParseEval<"[($posts(author:=*)):30]", typeof _usersSchema>
    >().toEqualTypeOf<true>();
  });

  it("should fail for invalid references", () => {
    expectTypeOf<
      ParseEval<"[($invalid(field:=value)):30]", typeof _usersSchema>
    >().toEqualTypeOf<"[Error on filter]: Collection `invalid` not registered">();
  });

  it("should parse filters with array operations", () => {
    expectTypeOf<
      ParseEval<
        "[(name:[`John`, `Jane`]):30, (age:[20..30]):20]",
        typeof _usersSchema
      >
    >().toEqualTypeOf<true>();
  });
});
