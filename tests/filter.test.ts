import type { FieldType, FieldTypeMap } from "@/collection/base";
import type {
  CheckFilterSquareBrackets,
  CheckParentheses,
  FilterTokenizer,
  IsNextFilterTokenValid,
  IsValidFilterArray,
  ParseFilter,
  ParseWithJoinTracking,
  ReadEscapeToken,
  ReadFilterToken,
  TypeToOperatorMap,
  ValidNextTokenMap,
} from "@/lexer/filter";
import type {
  GeoToken,
  Ident,
  LiteralToken,
  NumToken,
  ReferenceToken,
} from "@/lexer/token";

import { collection } from "@/collection/base";
import { describe, expectTypeOf, it } from "vitest";

const _usersSchema = collection({
  name: "users",
  fields: [
    { type: "string", optional: false, name: "id" },
    { type: "string", optional: false, name: "name" },
    { type: "int32", optional: false, name: "age", sort: true },
    { type: "string", optional: true, name: "email" },
    { type: "geopoint", name: "location" },
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

const _commentSchema = collection({
  name: "comments",
  fields: [
    { type: "string", optional: false, name: "id" },
    { type: "string", optional: false, name: "content" },
    {
      type: "string",
      optional: false,
      name: "post",
      reference: "posts.id",
    },
  ],
});

const _unregisteredSchema = collection({
  name: "unregistered",
  fields: [{ type: "string", optional: false, name: "id" }],
});

const _testSchema = collection({
  name: "testFields",
  fields: [
    { type: "string", optional: false, name: "id" },
    { type: "string", optional: false, name: "indexedField" },
    { type: "string", optional: false, name: "nonIndexedField", index: false },
    { type: "string", optional: false, name: "nonStoredField", store: false },
    { type: "int32", optional: false, name: "numberField" },
    { type: "int32", optional: false, name: "nonIndexedNumber", index: false },
  ],
});

declare module "@/collection/base" {
  interface Collections {
    posts: typeof _postsSchema;
    comments: typeof _commentSchema;
    testFields: typeof _testSchema;
  }
}

describe("ReadToken tests", () => {
  it("should read an left parenthesis", () => {
    expectTypeOf<ReadFilterToken<"( age = 20">>().toEqualTypeOf<
      ["(", " age = 20"]
    >();
  });
  it("should read an right parenthesis", () => {
    expectTypeOf<ReadFilterToken<") age = 20">>().toEqualTypeOf<
      [")", " age = 20"]
    >();
  });
  it("should read an left square bracket", () => {
    expectTypeOf<ReadFilterToken<":[ age = 20">>().toEqualTypeOf<
      [":[", " age = 20"]
    >();
  });
  it("should read an right square bracket", () => {
    expectTypeOf<ReadFilterToken<"] age = 20">>().toEqualTypeOf<
      ["]", " age = 20"]
    >();
  });
  it("should read a greater than operator", () => {
    expectTypeOf<ReadFilterToken<"> age = 20">>().toEqualTypeOf<
      [">", " age = 20"]
    >();
  });
  it("should read a prefixed greater than operator", () => {
    expectTypeOf<ReadFilterToken<":> age = 20">>().toEqualTypeOf<
      [":>", " age = 20"]
    >();
  });
  it("should read a lesser than operator", () => {
    expectTypeOf<ReadFilterToken<"< age = 20">>().toEqualTypeOf<
      ["<", " age = 20"]
    >();
  });
  it("should read a prefixed lesser than operator", () => {
    expectTypeOf<ReadFilterToken<":< age = 20">>().toEqualTypeOf<
      [":<", " age = 20"]
    >();
  });
  it("should read a greater than equal operator", () => {
    expectTypeOf<ReadFilterToken<":>= age = 20">>().toEqualTypeOf<
      [":>=", " age = 20"]
    >();
  });
  it("should read a lesser than equal operator", () => {
    expectTypeOf<ReadFilterToken<":<= age = 20">>().toEqualTypeOf<
      [":<=", " age = 20"]
    >();
  });
  it("should read an equal operator", () => {
    expectTypeOf<ReadFilterToken<":= age = 20">>().toEqualTypeOf<
      [":=", " age = 20"]
    >();
  });
  it("should read a not equal operator", () => {
    expectTypeOf<ReadFilterToken<":!= age = 20">>().toEqualTypeOf<
      [":!=", " age = 20"]
    >();
  });
  it("should read a bang operator", () => {
    expectTypeOf<ReadFilterToken<":! age = 20">>().toEqualTypeOf<
      [":!", " age = 20"]
    >();
  });
  it("should read a colon operator", () => {
    expectTypeOf<ReadFilterToken<": age = 20">>().toEqualTypeOf<
      [":", " age = 20"]
    >();
  });
  it("should read logical AND operator", () => {
    expectTypeOf<ReadFilterToken<"&& age = 20">>().toEqualTypeOf<
      ["&&", " age = 20"]
    >();
  });
  it("should read logical OR operator", () => {
    expectTypeOf<ReadFilterToken<"|| age = 20">>().toEqualTypeOf<
      ["||", " age = 20"]
    >();
  });
  it("should read a spread operator", () => {
    expectTypeOf<ReadFilterToken<"... age = 20">>().toEqualTypeOf<
      ["..", ". age = 20"]
    >();
  });
  it("should read a comma operator", () => {
    expectTypeOf<ReadFilterToken<",. age = 20">>().toEqualTypeOf<
      [",", ". age = 20"]
    >();
  });
  it("should read a reference", () => {
    expectTypeOf<ReadFilterToken<"$products(id:=1) age = 20">>().toEqualTypeOf<
      [ReferenceToken<"products", "id:=1">, " age = 20"]
    >();
  });
  it("should read a geo token", () => {
    expectTypeOf<
      ReadFilterToken<":(29.38, 27.832384, 2.3 km)">
    >().toEqualTypeOf<[GeoToken<"29.38, 27.832384, 2.3 km">, ""]>();
  });
  it("should not read an illegal token", () => {
    expectTypeOf<ReadFilterToken<" = age = 20">>().toEqualTypeOf<
      ["", " = age = 20"]
    >();
    expectTypeOf<ReadFilterToken<"= age = 20">>().toEqualTypeOf<
      ["", "= age = 20"]
    >();
    expectTypeOf<ReadFilterToken<"age := 20">>().toEqualTypeOf<
      ["", "age := 20"]
    >();
  });
});

describe("FieldTypeMap tests", () => {
  it("should map a string field type", () => {
    expectTypeOf<FieldTypeMap<typeof _usersSchema>>().toEqualTypeOf<{
      id: "string";
      name: "string";
      age: "int32";
      email: "string";
      location: "geopoint";
    }>();
  });
});

describe("ReadEscapeToken tests", () => {
  it("should read an escape token", () => {
    expectTypeOf<ReadEscapeToken<"`John()` Doe">>().toEqualTypeOf<
      ["John()", " Doe"]
    >();
  });
  it("should not read an escape token that's not matched", () => {
    expectTypeOf<ReadEscapeToken<"`John() Doe">>().toEqualTypeOf<
      ["", "`John() Doe"]
    >();
  });
});

describe("FilterTokenizer tests", () => {
  it("should tokenize a valid input string", () => {
    expectTypeOf<
      FilterTokenizer<
        "(age := 20) && name:[`John()`, Doe] || age:[20..30, 3.50] && $products(id:*) && $join2($join3(attr:val)) || name:N2",
        typeof _usersSchema
      >
    >().toEqualTypeOf<
      [
        "(",
        Ident<"age", "int32">,
        ":=",
        NumToken<"20">,
        ")",
        "&&",
        Ident<"name", "string">,
        ":[",
        LiteralToken<`John()`>,
        ",",
        LiteralToken<"Doe">,
        "]",
        "||",
        Ident<"age", "int32">,
        ":[",
        NumToken<"20">,
        "..",
        NumToken<"30">,
        ",",
        NumToken<"3.50">,
        "]",
        "&&",
        ReferenceToken<"products", "id:*">,
        "&&",
        ReferenceToken<"join2", "$join3(attr:val)">,
        "||",
        Ident<"name", "string">,
        ":",
        LiteralToken<"N2">,
      ]
    >();
  });
  it("should not tokenize an invalid input string", () => {
    expectTypeOf<
      FilterTokenizer<"age != 20", typeof _usersSchema>
    >().toEqualTypeOf<"Unknown token: !">();
  });
});

describe("IsNextTokenValid type tests", () => {
  describe("Left Parenthesis", () => {
    it("should validate a left parenthesis followed by an identifier", () => {
      expectTypeOf<
        IsNextFilterTokenValid<
          "(",
          typeof _usersSchema,
          [Ident<"age", "int32">]
        >
      >().toEqualTypeOf<true>();
    });

    it("should invalidate a left parenthesis followed by a right parenthesis", () => {
      expectTypeOf<
        IsNextFilterTokenValid<"(", typeof _usersSchema, [")"]>
      >().toEqualTypeOf<"Invalid token sequence: `(` followed by `)`">();
    });
  });

  describe("Identifier", () => {
    it("should validate an identifier followed by an operator", () => {
      expectTypeOf<
        IsNextFilterTokenValid<
          Ident<"location", "string">,
          typeof _usersSchema,
          [GeoToken<string>, ":", LiteralToken<"t">]
        >
      >().toEqualTypeOf<true>();
    });
    it("should validate a geopoint identifier followed by geo token", () => {
      expectTypeOf<
        IsNextFilterTokenValid<
          Ident<"location", "geopoint">,
          typeof _usersSchema,
          [GeoToken<string>]
        >
      >().toEqualTypeOf<true>();
    });
    it("should invalidate an identifier followed by another identifier", () => {
      expectTypeOf<
        IsNextFilterTokenValid<
          Ident<"age", "int32">,
          typeof _usersSchema,
          [Ident<"name", "string">]
        >
      >().toEqualTypeOf<"Invalid token sequence: identifier with name `age` followed by identifier">();
    });
  });

  describe("Right Parenthesis", () => {
    it("should validate a right parenthesis followed by a logical AND operator", () => {
      expectTypeOf<
        IsNextFilterTokenValid<")", typeof _usersSchema, ["&&"]>
      >().toEqualTypeOf<true>();
    });

    it("should invalidate a right parenthesis followed by an identifier", () => {
      expectTypeOf<
        IsNextFilterTokenValid<
          ")",
          typeof _usersSchema,
          [Ident<"age", "int32">]
        >
      >().toEqualTypeOf<"Invalid token sequence: `)` followed by identifier">();
    });
  });

  describe("Operators", () => {
    it("should validate an operator followed by a literal token", () => {
      expectTypeOf<
        IsNextFilterTokenValid<":", typeof _usersSchema, [LiteralToken<"John">]>
      >().toEqualTypeOf<true>();
    });

    it("should invalidate an operator followed by another operator", () => {
      expectTypeOf<
        IsNextFilterTokenValid<":", typeof _usersSchema, [":"]>
      >().toEqualTypeOf<"Invalid token sequence: `:` followed by `:`">();
    });
  });

  describe("Logical Operators", () => {
    it("should validate a logical operator followed by a left parenthesis", () => {
      expectTypeOf<
        IsNextFilterTokenValid<"&&", typeof _usersSchema, ["("]>
      >().toEqualTypeOf<true>();
    });

    it("should invalidate a logical operator followed by another logical operator", () => {
      expectTypeOf<
        IsNextFilterTokenValid<"&&", typeof _usersSchema, ["&&"]>
      >().toEqualTypeOf<"Invalid token sequence: `&&` followed by `&&`">();
    });
  });

  describe("Literal Tokens", () => {
    it("should validate a literal token followed by a right parenthesis", () => {
      expectTypeOf<
        IsNextFilterTokenValid<LiteralToken<"John">, typeof _usersSchema, [")"]>
      >().toEqualTypeOf<true>();
    });
    it("should invalidate a literal token followed by an identifier", () => {
      expectTypeOf<
        IsNextFilterTokenValid<
          LiteralToken<"John">,
          typeof _usersSchema,
          [Ident<"age", "int32">]
        >
      >().toEqualTypeOf<"Invalid token sequence: Literal Token `John` followed by identifier">();
    });
  });

  describe("Integer Tokens", () => {
    it("should validate an integer token followed by a right parenthesis", () => {
      expectTypeOf<
        IsNextFilterTokenValid<NumToken<"20">, typeof _usersSchema, [")"]>
      >().toEqualTypeOf<true>();
    });

    it("should invalidate an integer token followed by an identifier", () => {
      expectTypeOf<
        IsNextFilterTokenValid<
          NumToken<"20">,
          typeof _usersSchema,
          [Ident<"age", "int32">]
        >
      >().toEqualTypeOf<"Invalid token sequence: Num Token `20` followed by identifier">();
    });
  });

  describe("Left Square Bracket", () => {
    it("should validate a left square bracket followed by an integer token", () => {
      expectTypeOf<
        IsNextFilterTokenValid<
          Ident<"age", "int32">,
          typeof _usersSchema,
          [":[", NumToken<"20">]
        >
      >().toEqualTypeOf<true>();
    });

    it("should invalidate a left square bracket followed by a right parenthesis", () => {
      expectTypeOf<
        IsNextFilterTokenValid<":[", typeof _usersSchema, [")"]>
      >().toEqualTypeOf<"Invalid token sequence: `:[` followed by `)`">();
    });
  });

  describe("Right Square Bracket", () => {
    it("should validate a right square bracket followed by a logical AND operator", () => {
      expectTypeOf<
        IsNextFilterTokenValid<"]", typeof _usersSchema, ["&&"]>
      >().toEqualTypeOf<true>();
    });

    it("should invalidate a right square bracket followed by an identifier", () => {
      expectTypeOf<
        IsNextFilterTokenValid<
          "]",
          typeof _usersSchema,
          [Ident<"age", "int32">]
        >
      >().toEqualTypeOf<"Invalid token sequence: `]` followed by identifier">();
    });
  });

  describe("Comma", () => {
    it("should validate a comma followed by an integer token", () => {
      expectTypeOf<
        IsNextFilterTokenValid<",", typeof _usersSchema, [NumToken<"20">]>
      >().toEqualTypeOf<true>();
    });

    it("should invalidate a comma followed by a right parenthesis", () => {
      expectTypeOf<
        IsNextFilterTokenValid<",", typeof _usersSchema, [")"]>
      >().toEqualTypeOf<"Invalid token sequence: `,` followed by `)`">();
    });
  });

  describe("Spread", () => {
    it("should validate a spread operator followed by an integer token", () => {
      expectTypeOf<
        IsNextFilterTokenValid<"..", typeof _usersSchema, [NumToken<"30">]>
      >().toEqualTypeOf<true>();
    });

    it("should invalidate a spread operator followed by a right parenthesis", () => {
      expectTypeOf<
        IsNextFilterTokenValid<"..", typeof _usersSchema, [")"]>
      >().toEqualTypeOf<"Invalid token sequence: `..` followed by `)`">();
    });
  });

  describe("Reference", () => {
    it("should invalidate if the current collection isn't registered", () => {
      expectTypeOf<
        IsNextFilterTokenValid<
          ReferenceToken<"products", "id:*">,
          typeof _unregisteredSchema,
          []
        >
      >().toEqualTypeOf<"Collection `unregistered` not registered">();
    });

    it("should invalidate if the joining collection isn't registered", () => {
      expectTypeOf<
        IsNextFilterTokenValid<
          ReferenceToken<"products", "id:*">,
          typeof _usersSchema,
          []
        >
      >().toEqualTypeOf<"Collection `products` not registered">();
    });

    it("should invalidate if the joining collection isn't referencing the collection", () => {
      expectTypeOf<
        IsNextFilterTokenValid<
          ReferenceToken<"comments", "id:*">,
          typeof _usersSchema,
          []
        >
      >().toEqualTypeOf<"Collection `comments` not referenced in `users`">();
    });

    it("should invalidate if the joining collection isn't parsed correctly", () => {
      expectTypeOf<
        IsNextFilterTokenValid<
          ReferenceToken<"posts", "(id:*">,
          typeof _usersSchema,
          []
        >
      >().toEqualTypeOf<"[Error on filter for joined collection `posts`]: Parentheses are not balanced">();
    });

    it("should validate if the reference is correct", () => {
      expectTypeOf<
        IsNextFilterTokenValid<
          ReferenceToken<"posts", "id:*">,
          typeof _usersSchema,
          []
        >
      >().toEqualTypeOf<true>();
    });

    it("should validate if the nested reference is correct", () => {
      expectTypeOf<
        IsNextFilterTokenValid<
          ReferenceToken<"posts", "$comments(post:=1)">,
          typeof _usersSchema,
          []
        >
      >().toEqualTypeOf<true>();
    });
  });
});

describe("ValidNextMap tests", () => {
  it("should validate next token for left parenthesis", () => {
    expectTypeOf<
      ValidNextTokenMap<typeof _usersSchema.fields>["("]
    >().toEqualTypeOf<"(" | Ident<string, FieldType>>();
  });

  it("should validate next token for right parenthesis", () => {
    expectTypeOf<
      ValidNextTokenMap<typeof _usersSchema.fields>[")"]
    >().toEqualTypeOf<")" | "&&" | "||">();
  });

  it("should validate next token for string field type", () => {
    expectTypeOf<
      ValidNextTokenMap<typeof _usersSchema.fields>["id"]
    >().toEqualTypeOf<":=" | ":!=" | ":" | ":[">();
  });

  it("should validate next token for int32 field type", () => {
    expectTypeOf<
      ValidNextTokenMap<typeof _usersSchema.fields>["age"]
    >().toEqualTypeOf<":[" | ":<" | ":>" | ":=" | ":>=" | ":<=" | ":!=">();
  });
});

describe("TypeToOperatorMap tests", () => {
  it("should map string field type to correct operators", () => {
    expectTypeOf<TypeToOperatorMap["string"]>().toEqualTypeOf<
      ":=" | ":" | ":!=" | ":["
    >();
  });

  it("should map int32 field type to correct operators", () => {
    expectTypeOf<TypeToOperatorMap["int32"]>().toEqualTypeOf<
      ":<" | ":>" | ":=" | ":>=" | ":<=" | ":!=" | ":["
    >();
  });

  it("should map int64 field type to correct operators", () => {
    expectTypeOf<TypeToOperatorMap["int64"]>().toEqualTypeOf<
      ":<" | ":>" | ":=" | ":>=" | ":<=" | ":!=" | ":["
    >();
  });

  it("should map float field type to correct operators", () => {
    expectTypeOf<TypeToOperatorMap["float"]>().toEqualTypeOf<
      ":<" | ":>" | ":=" | ":>=" | ":<=" | ":!=" | ":["
    >();
  });

  it("should map bool field type to correct operators", () => {
    expectTypeOf<TypeToOperatorMap["bool"]>().toEqualTypeOf<":=" | ":!=">();
  });

  it("should map int32[] field type to correct operators", () => {
    expectTypeOf<TypeToOperatorMap["int32[]"]>().toEqualTypeOf<
      ":<" | ":>" | ":="
    >();
  });

  it("should map int64[] field type to correct operators", () => {
    expectTypeOf<TypeToOperatorMap["int64[]"]>().toEqualTypeOf<
      ":<" | ":>" | ":="
    >();
  });

  it("should map float[] field type to correct operators", () => {
    expectTypeOf<TypeToOperatorMap["float[]"]>().toEqualTypeOf<
      ":<" | ":>" | ":="
    >();
  });

  it("should map bool[] field type to correct operators", () => {
    expectTypeOf<TypeToOperatorMap["bool[]"]>().toEqualTypeOf<":=">();
  });
});

describe("CheckParentheses tests", () => {
  it("should return true for balanced parentheses", () => {
    expectTypeOf<
      CheckParentheses<["(", ")", "(", ")"]>
    >().toEqualTypeOf<true>();
  });

  it("should return false for unbalanced parentheses (more opening)", () => {
    expectTypeOf<CheckParentheses<["(", "(", ")"]>>().toEqualTypeOf<false>();
  });

  it("should return false for unbalanced parentheses (more closing)", () => {
    expectTypeOf<CheckParentheses<[")", "(", ")"]>>().toEqualTypeOf<false>();
  });

  it("should return true for nested balanced parentheses", () => {
    expectTypeOf<
      CheckParentheses<["(", "(", ")", ")"]>
    >().toEqualTypeOf<true>();
  });

  it("should return false for nested unbalanced parentheses", () => {
    expectTypeOf<CheckParentheses<["(", "(", ")"]>>().toEqualTypeOf<false>();
  });

  it("should return true for Tokens without parentheses", () => {
    expectTypeOf<
      CheckParentheses<[LiteralToken<"Name">, NumToken<"30">]>
    >().toEqualTypeOf<true>();
  });

  it("should return true for empty array", () => {
    expectTypeOf<CheckParentheses<[]>>().toEqualTypeOf<true>();
  });
});

describe("CheckSquareBrackets tests", () => {
  it("should return true for balanced square brackets", () => {
    expectTypeOf<
      CheckFilterSquareBrackets<[":[", "]"]>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      CheckFilterSquareBrackets<[":[", "(", ")", "]"]>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      CheckFilterSquareBrackets<[":[", ":[", "]", "]"]>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      CheckFilterSquareBrackets<[":[", ":[", ":[", "]", "]", "]"]>
    >().toEqualTypeOf<true>();
  });

  it("should return false for unbalanced square brackets (more opening)", () => {
    expectTypeOf<
      CheckFilterSquareBrackets<[":[", ":[", "]"]>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      CheckFilterSquareBrackets<[":[", ":[", ":[", "]", "]"]>
    >().toEqualTypeOf<false>();
  });

  it("should return false for unbalanced square brackets (more closing)", () => {
    expectTypeOf<
      CheckFilterSquareBrackets<[":[", "]", "]"]>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      CheckFilterSquareBrackets<[":[", ":[", "]", "]", "]"]>
    >().toEqualTypeOf<false>();
  });

  it("should return false for unbalanced square brackets with other tokens", () => {
    expectTypeOf<
      CheckFilterSquareBrackets<[":[", "(", ")"]>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      CheckFilterSquareBrackets<[":[", "(", ")", "]", "]"]>
    >().toEqualTypeOf<false>();
  });

  it("should return true for balanced square brackets with other tokens", () => {
    expectTypeOf<
      CheckFilterSquareBrackets<[":[", "(", ")", ":[", "]", "]"]>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      CheckFilterSquareBrackets<[":[", "(", ")", ":[", ":[", "]", "]", "]"]>
    >().toEqualTypeOf<true>();
  });

  it("should return true for empty token array", () => {
    expectTypeOf<CheckFilterSquareBrackets<[]>>().toEqualTypeOf<true>();
  });
});

describe("IsValidArray tests", () => {
  it("should return true for an empty array", () => {
    expectTypeOf<
      IsValidFilterArray<[], typeof _usersSchema>
    >().toEqualTypeOf<true>();
  });

  it("should return false for a single valid token", () => {
    expectTypeOf<
      IsValidFilterArray<["("], typeof _usersSchema>
    >().toEqualTypeOf<"Invalid token sequence: `(` cannot be the only token">();
  });

  it("should return true for a sequence of valid tokens", () => {
    expectTypeOf<
      IsValidFilterArray<
        [
          "(",
          Ident<"age", "int32">,
          ":=",
          NumToken<"20">,
          ")",
          "&&",
          Ident<"name", "string">,
          ":[",
          LiteralToken<"John">,
          ",",
          LiteralToken<"Doe">,
          "]",
        ],
        typeof _usersSchema
      >
    >().toEqualTypeOf<true>();
  });

  it("should return true for a sequence of valid tokens with a reference", () => {
    expectTypeOf<
      IsValidFilterArray<
        [
          "(",
          Ident<"age", "int32">,
          ":=",
          NumToken<"20">,
          ")",
          "&&",
          ReferenceToken<"posts", "id:*">,
        ],
        typeof _usersSchema
      >
    >().toEqualTypeOf<true>();
  });

  it("should return true for a sequence of valid tokens with a nested reference", () => {
    expectTypeOf<
      IsValidFilterArray<
        [
          "(",
          Ident<"age", "int32">,
          ":=",
          NumToken<"20">,
          ")",
          "&&",
          ReferenceToken<"posts", "$comments(post:=1)">,
        ],
        typeof _usersSchema
      >
    >().toEqualTypeOf<true>();
  });

  it("should return false for a sequence of valid tokens with a nested reference", () => {
    expectTypeOf<
      IsValidFilterArray<
        [
          "(",
          Ident<"age", "int32">,
          ":=",
          NumToken<"20">,
          ")",
          "&&",
          ReferenceToken<"posts", "$users(post:=1)">,
        ],
        typeof _usersSchema
      >
    >().toEqualTypeOf<"[Error on filter for joined collection `posts`]: Collection `users` not referenced in `posts`">();
  });

  it("should return false for a sequence with an invalid token", () => {
    expectTypeOf<
      IsValidFilterArray<
        [
          "(",
          Ident<"age", "int32">,
          ":=",
          NumToken<"20">,
          ")",
          "&&",
          LiteralToken<"John">,
        ],
        typeof _usersSchema
      >
    >().toEqualTypeOf<"Invalid token sequence: `&&` followed by literal token">();
  });

  it("should return false for a sequence with an invalid starting token", () => {
    expectTypeOf<
      IsValidFilterArray<[":=", NumToken<"20">, ")"], typeof _usersSchema>
    >().toEqualTypeOf<"Invalid start token: `:=`">();
  });

  it("should return false for a sequence with an invalid transition", () => {
    expectTypeOf<
      IsValidFilterArray<
        [
          "(",
          Ident<"age", "int32">,
          ":=",
          NumToken<"20">,
          Ident<"name", "string">,
        ],
        typeof _usersSchema
      >
    >().toEqualTypeOf<"Invalid token sequence: Num Token `20` followed by identifier">();
  });
});

describe("ParseFilter tests", () => {
  it("should parse a valid filter string", () => {
    type B = ParseWithJoinTracking<
      "$posts($comments(post=1))",
      typeof _usersSchema
    >;
    const _a: B = {
      isValid: false,
      joins: [
        {
          sourceCollection: "users",
          targetCollection: "posts",
          clause: "$comments(post=1)",
          nested: [
            {
              sourceCollection: "posts",
              targetCollection: "comments",
              clause: "post=1",
              nested: [],
            },
          ],
        },
      ],
      errors:
        "[Error on filter for joined collection `posts`]: [Error on filter for joined collection `comments`]: Unknown token: =",
    };
    expectTypeOf<
      ParseFilter<
        "(age := 30) && name:[`Alice(!)`, `Bob`] || (name:[Kostas, Giannis] && age:[30..20, 50]) && email:=`kostas@gmail.com` || age:=30 && name:[`Alice`, `Bob`] && email:[`john@mail.en`, Acm] && $posts(title:name && $comments(post:1 && content:An*))",
        typeof _usersSchema
      >
    >().toEqualTypeOf<true>();
  });

  it("should fail parsing due to unbalanced parentheses", () => {
    expectTypeOf<
      ParseFilter<"(age := 30 && name:[`Alice`, `Bob`]", typeof _usersSchema>
    >().toEqualTypeOf<"Parentheses are not balanced">();
  });

  it("should fail parsing due to unbalanced square brackets", () => {
    expectTypeOf<
      ParseFilter<"(age := 30) && name:[`Alice`, `Bob`", typeof _usersSchema>
    >().toEqualTypeOf<"Square brackets are not balanced">();
  });

  it("should fail parsing due to invalid token", () => {
    expectTypeOf<
      ParseFilter<"(age := 30) && name:[`Alice`, `Bob`", typeof _usersSchema>
    >().toEqualTypeOf<"Square brackets are not balanced">();
  });

  it("should parse a valid filter string with logical operators", () => {
    expectTypeOf<
      ParseFilter<
        "(age := 30) || (email := `alice@example.com`)",
        typeof _usersSchema
      >
    >().toEqualTypeOf<true>();
  });

  it("should fail parsing due to invalid token sequence", () => {
    expectTypeOf<
      ParseFilter<
        "(age := 30) && && name:[`Alice`, `Bob`]",
        typeof _usersSchema
      >
    >().toEqualTypeOf<"Invalid token sequence: `&&` followed by `&&`">();
  });

  it("should parse a valid filter string with nested parentheses", () => {
    expectTypeOf<
      ParseFilter<
        "((age := 30) && (email := `alice@example.com`))",
        typeof _usersSchema
      >
    >().toEqualTypeOf<true>();
  });

  it("should fail parsing due to invalid identifier", () => {
    expectTypeOf<
      ParseFilter<
        "(invalidField := 30) && name:[`Alice`, `Bob`]",
        typeof _usersSchema
      >
    >().toEqualTypeOf<"Invalid token sequence: Literal Token `invalidField` followed by `:=`">();
  });

  it("should fail parsing due to a faulty reference", () => {
    expectTypeOf<
      ParseFilter<
        "$products(id:*) && name:[`Alice`, `Bob`]",
        typeof _usersSchema
      >
    >().toEqualTypeOf<"Collection `products` not registered">();
  });

  it("should fail parsing due to a faulty nested reference", () => {
    expectTypeOf<
      ParseFilter<"$posts($users(name:=John))", typeof _usersSchema>
    >().toEqualTypeOf<"[Error on filter for joined collection `posts`]: Collection `users` not referenced in `posts`">();
  });

  it("should fail parsing due to a tokenizer error", () => {
    expectTypeOf<
      ParseFilter<"age != 20", typeof _usersSchema>
    >().toEqualTypeOf<"Unknown token: !">();
  });
});

describe("Field filterability tests", () => {
  it("should allow filtering on indexed fields", () => {
    expectTypeOf<
      ParseFilter<"indexedField := `test`", typeof _testSchema>
    >().toEqualTypeOf<true>();
  });

  it("should allow filtering on stored fields by default", () => {
    expectTypeOf<
      ParseFilter<"numberField := 42", typeof _testSchema>
    >().toEqualTypeOf<true>();
  });

  it("should reject filtering on fields with index: false", () => {
    expectTypeOf<
      ParseFilter<"nonIndexedField := `test`", typeof _testSchema>
    >().toEqualTypeOf<"Field `nonIndexedField` cannot be filtered (index: false or store: false)">();
  });

  it("should reject filtering on fields with store: false", () => {
    expectTypeOf<
      ParseFilter<"nonStoredField := `test`", typeof _testSchema>
    >().toEqualTypeOf<"Field `nonStoredField` cannot be filtered (index: false or store: false)">();
  });

  it("should reject filtering on numeric fields with index: false", () => {
    expectTypeOf<
      ParseFilter<"nonIndexedNumber := 42", typeof _testSchema>
    >().toEqualTypeOf<"Field `nonIndexedNumber` cannot be filtered (index: false or store: false)">();
  });

  it("should reject filtering in complex expressions with non-filterable fields", () => {
    expectTypeOf<
      ParseFilter<
        "(indexedField := `test`) && (nonIndexedField := `value`)",
        typeof _testSchema
      >
    >().toEqualTypeOf<"Field `nonIndexedField` cannot be filtered (index: false or store: false)">();
  });

  it("should reject filtering in array operations with non-filterable fields", () => {
    expectTypeOf<
      ParseFilter<"nonIndexedField:[`test1`, `test2`]", typeof _testSchema>
    >().toEqualTypeOf<"Field `nonIndexedField` cannot be filtered (index: false or store: false)">();
  });
});
