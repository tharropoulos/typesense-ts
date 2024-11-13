import type { FieldType } from "@/collection/base";
import type {
  ConfigToken,
  Ident,
  IsValid,
  IsValidArray,
  SortParse,
  Tokenizer,
} from "@/lexer/sort";
import type { Colon } from "@/lexer/token";

import { collection } from "@/collection/base";
import { describe, expectTypeOf, it } from "vitest";

const _usersSchema = collection({
  name: "users",
  fields: [
    { type: "string", optional: false, name: "id" },
    { type: "string", optional: false, name: "name" },
    { type: "int32", optional: false, name: "age", sort: true },
    { type: "string", optional: true, name: "email" },
    { type: "float", optional: false, name: "score", sort: true },
    { type: "string", optional: false, name: "username" },
    { type: "int64", optional: false, name: "createdAt", sort: true },
    { type: "int64", optional: false, name: "updatedAt", sort: true },
    { type: "bool", optional: false, name: "isActive" },
    { type: "string", optional: true, name: "phoneNumber" },
    { type: "int32", optional: false, name: "loginCount", sort: true },
    { type: "string", optional: true, name: "address" },
    { type: "string", optional: true, name: "city" },
    { type: "string", optional: true, name: "country" },
    { type: "float", optional: false, name: "height", sort: true },
    { type: "float", optional: false, name: "weight", sort: true },
    { type: "string", optional: true, name: "occupation" },
    { type: "int32", optional: false, name: "experienceYears", sort: true },
    { type: "float", optional: false, name: "rating", sort: true },
    { type: "string", optional: true, name: "department" },
    { type: "int32", optional: false, name: "reportsCount", sort: true },
    { type: "string", optional: true, name: "profilePicture" },
    { type: "bool", optional: false, name: "isVerified" },
    { type: "string", optional: true, name: "language" },
    { type: "int32", optional: false, name: "followers", sort: true },
    { type: "int32", optional: false, name: "following", sort: true },
    { type: "float", optional: false, name: "completionRate", sort: true },
    { type: "string", optional: true, name: "timezone" },
    { type: "string", optional: true, name: "title" },
    { type: "int32", optional: false, name: "level", sort: true },
  ],
  default_sorting_field: "age",
});

describe("Tokenizer tests", () => {
  it("should tokenize a simple sort expression", () => {
    expectTypeOf<Tokenizer<"age:desc">>().toEqualTypeOf<
      [Ident<"age", FieldType>, Colon, "desc"]
    >();
  });

  it("should tokenize multiple sort expressions", () => {
    expectTypeOf<Tokenizer<"age:desc,score:asc">>().toEqualTypeOf<
      [
        Ident<"age", FieldType>,
        Colon,
        "desc",
        ",",
        Ident<"score", FieldType>,
        Colon,
        "asc",
      ]
    >();
  });

  it("should tokenize sort with missing_values config", () => {
    expectTypeOf<Tokenizer<"age(missing_values:first):desc ">>().toEqualTypeOf<
      [
        Ident<"age", FieldType>,
        ConfigToken<"missing_values", "first">,
        Colon,
        "desc",
      ]
    >();
  });

  it("should tokenize _eval expression", () => {
    expectTypeOf<Tokenizer<"_eval(age:>=20):desc">>().toEqualTypeOf<
      [{ type: "eval"; clause: "age:>=20" }, Colon, "desc"]
    >();
  });
});

describe("IsValid tests", () => {
  it("should validate sortable field", () => {
    expectTypeOf<
      IsValid<Ident<"age", "int32">, typeof _usersSchema, [Colon, "desc"]>
    >().toEqualTypeOf<true>();
  });

  it("should invalidate non-sortable field", () => {
    expectTypeOf<
      IsValid<Ident<"email", "string">, typeof _usersSchema, [Colon, "desc"]>
    >().toEqualTypeOf<"Invalid identifier: email is not a sortable field.">();
  });

  it("should validate _text_match_score field", () => {
    expectTypeOf<
      IsValid<
        Ident<"_text_match_score", "float">,
        typeof _usersSchema,
        [Colon, "desc"]
      >
    >().toEqualTypeOf<true>();
  });

  it("should validate sort direction", () => {
    expectTypeOf<
      IsValid<"desc", typeof _usersSchema, []>
    >().toEqualTypeOf<true>();

    expectTypeOf<
      IsValid<"desc", typeof _usersSchema, [","]>
    >().toEqualTypeOf<true>();
  });

  it("should invalidate incorrect tokens after sort direction", () => {
    expectTypeOf<
      IsValid<"desc", typeof _usersSchema, [Colon]>
    >().toEqualTypeOf<"Invalid token sequence: sort direction must be followed by `,` or end of input.">();
  });

  it("should validate comma followed by identifier", () => {
    expectTypeOf<
      IsValid<",", typeof _usersSchema, [Ident<"age", "int32">]>
    >().toEqualTypeOf<true>();
  });

  it("should invalidate comma not followed by identifier", () => {
    expectTypeOf<
      IsValid<",", typeof _usersSchema, [Colon]>
    >().toEqualTypeOf<"Invalid token sequence: `,` must be followed by an identifier.">();
  });

  it("should validate colon followed by sort order", () => {
    expectTypeOf<
      IsValid<":", typeof _usersSchema, ["asc"]>
    >().toEqualTypeOf<true>();
  });

  it("should validate missing_values config", () => {
    expectTypeOf<
      IsValid<
        { type: "config"; key: "missing_values"; value: "first" },
        typeof _usersSchema,
        [Colon]
      >
    >().toEqualTypeOf<true>();
  });
});

describe("IsValidArray tests", () => {
  it("should validate single sort expression", () => {
    expectTypeOf<
      IsValidArray<[Ident<"age", "int32">, Colon, "desc"], typeof _usersSchema>
    >().toEqualTypeOf<true>();
  });

  it("should validate multiple sort expressions", () => {
    expectTypeOf<
      IsValidArray<
        [
          Ident<"age", "int32">,
          Colon,
          "desc",
          ",",
          Ident<"score", "float">,
          Colon,
          "asc",
        ],
        typeof _usersSchema
      >
    >().toEqualTypeOf<true>();
  });

  it("should validate sort with config", () => {
    expectTypeOf<
      IsValidArray<
        [
          Ident<"age", "int32">,
          { type: "config"; key: "missing_values"; value: "first" },
          Colon,
          "desc",
        ],
        typeof _usersSchema
      >
    >().toEqualTypeOf<true>();
  });
});

describe("FilterParse tests", () => {
  it("should parse simple sort expression", () => {
    expectTypeOf<
      SortParse<"age:desc", typeof _usersSchema>
    >().toEqualTypeOf<true>();
  });

  it("should parse multiple sort expressions", () => {
    expectTypeOf<
      SortParse<"age:desc,score:asc", typeof _usersSchema>
    >().toEqualTypeOf<true>();
  });

  it("should parse sort with missing_values config", () => {
    expectTypeOf<
      SortParse<"age(missing_values:first):desc ", typeof _usersSchema>
    >().toEqualTypeOf<true>();
  });

  it("should parse sort with _text_match_score", () => {
    expectTypeOf<
      SortParse<"_text_match_score:asc, age:asc", typeof _usersSchema>
    >().toEqualTypeOf<true>();
  });

  it("should parse _eval expression", () => {
    expectTypeOf<
      SortParse<
        "_eval([(age:>=20):20, (name: `John`):5]):desc, age(missing_values:last):desc",
        typeof _usersSchema
      >
    >().toEqualTypeOf<true>();
  });

  it("should fail for non-sortable field", () => {
    expectTypeOf<
      SortParse<"email:desc", typeof _usersSchema>
    >().toEqualTypeOf<"Invalid token sequence: Invalid identifier: email is not a sortable field.">();
  });

  it("should fail for invalid sort direction", () => {
    expectTypeOf<
      SortParse<"age:invalid", typeof _usersSchema>
    >().toEqualTypeOf<"Invalid token sequence: Invalid token sequence: `:` must be followed by 'asc' or 'desc'.">();
  });

  it("should fail for invalid config", () => {
    expectTypeOf<
      SortParse<"age:desc invalid:config", typeof _usersSchema>
    >().toEqualTypeOf<"Invalid token sequence: Invalid token sequence: sort direction must be followed by `,` or end of input.">();
  });
});
