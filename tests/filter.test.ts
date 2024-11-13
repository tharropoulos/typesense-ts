import type { FieldType, FieldTypeMap } from "@/collection/base";
import type {
  CheckParentheses,
  CheckSquareBrackets,
  FilterTokenizer,
  IsNextTokenValid,
  IsValidArray,
  ParseFilter,
  ReadEscapeToken,
  ReadToken,
  TypeToOperatorMap,
  ValidNextTokenMap,
} from "@/lexer/filter";
import type {
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

declare module "@/collection/base" {
  interface GlobalCollections {
    users: typeof _usersSchema;
    posts: typeof _postsSchema;
    comments: typeof _commentSchema;
  }
}

describe("ReadToken tests", () => {
  it("should read an left parenthesis", () => {
    expectTypeOf<ReadToken<"( age = 20">>().toEqualTypeOf<["(", " age = 20"]>();
  });
  it("should read an right parenthesis", () => {
    expectTypeOf<ReadToken<") age = 20">>().toEqualTypeOf<[")", " age = 20"]>();
  });
  it("should read an left square bracket", () => {
    expectTypeOf<ReadToken<":[ age = 20">>().toEqualTypeOf<
      [":[", " age = 20"]
    >();
  });
  it("should read an right square bracket", () => {
    expectTypeOf<ReadToken<"] age = 20">>().toEqualTypeOf<["]", " age = 20"]>();
  });
  it("should read a greater than operator", () => {
    expectTypeOf<ReadToken<"> age = 20">>().toEqualTypeOf<[">", " age = 20"]>();
  });
  it("should read a prefixed greater than operator", () => {
    expectTypeOf<ReadToken<":> age = 20">>().toEqualTypeOf<
      [":>", " age = 20"]
    >();
  });
  it("should read a lesser than operator", () => {
    expectTypeOf<ReadToken<"< age = 20">>().toEqualTypeOf<["<", " age = 20"]>();
  });
  it("should read a prefixed lesser than operator", () => {
    expectTypeOf<ReadToken<":< age = 20">>().toEqualTypeOf<
      [":<", " age = 20"]
    >();
  });
  it("should read a greater than equal operator", () => {
    expectTypeOf<ReadToken<":>= age = 20">>().toEqualTypeOf<
      [":>=", " age = 20"]
    >();
  });
  it("should read a lesser than equal operator", () => {
    expectTypeOf<ReadToken<":<= age = 20">>().toEqualTypeOf<
      [":<=", " age = 20"]
    >();
  });
  it("should read an equal operator", () => {
    expectTypeOf<ReadToken<":= age = 20">>().toEqualTypeOf<
      [":=", " age = 20"]
    >();
  });
  it("should read a not equal operator", () => {
    expectTypeOf<ReadToken<":!= age = 20">>().toEqualTypeOf<
      [":!=", " age = 20"]
    >();
  });
  it("should read a bang operator", () => {
    expectTypeOf<ReadToken<":! age = 20">>().toEqualTypeOf<
      [":!", " age = 20"]
    >();
  });
  it("should read a colon operator", () => {
    expectTypeOf<ReadToken<": age = 20">>().toEqualTypeOf<[":", " age = 20"]>();
  });
  it("should read logical AND operator", () => {
    expectTypeOf<ReadToken<"&& age = 20">>().toEqualTypeOf<
      ["&&", " age = 20"]
    >();
  });
  it("should read logical OR operator", () => {
    expectTypeOf<ReadToken<"|| age = 20">>().toEqualTypeOf<
      ["||", " age = 20"]
    >();
  });
  it("should read a spread operator", () => {
    expectTypeOf<ReadToken<"... age = 20">>().toEqualTypeOf<
      ["..", ". age = 20"]
    >();
  });
  it("should read a comma operator", () => {
    expectTypeOf<ReadToken<",. age = 20">>().toEqualTypeOf<
      [",", ". age = 20"]
    >();
  });
  it("should read a reference", () => {
    expectTypeOf<ReadToken<"$products(id:=1) age = 20">>().toEqualTypeOf<
      [ReferenceToken<"products", "id:=1">, " age = 20"]
    >();
  });
  it("should not read an illegal token", () => {
    expectTypeOf<ReadToken<" = age = 20">>().toEqualTypeOf<
      ["", " = age = 20"]
    >();
    expectTypeOf<ReadToken<"= age = 20">>().toEqualTypeOf<["", "= age = 20"]>();
    expectTypeOf<ReadToken<"age := 20">>().toEqualTypeOf<["", "age := 20"]>();
  });
});

describe("FieldTypeMap tests", () => {
  it("should map a string field type", () => {
    expectTypeOf<FieldTypeMap<typeof _usersSchema>>().toEqualTypeOf<{
      id: "string";
      name: "string";
      age: "int32";
      email: "string";
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
        IsNextTokenValid<"(", typeof _usersSchema, [Ident<"age", "int32">]>
      >().toEqualTypeOf<true>();
    });

    it("should invalidate a left parenthesis followed by a right parenthesis", () => {
      expectTypeOf<
        IsNextTokenValid<"(", typeof _usersSchema, [")"]>
      >().toEqualTypeOf<"Invalid token sequence: `(` followed by `)`">();
    });
  });

  describe("Identifier", () => {
    it("should validate an identifier followed by an operator", () => {
      expectTypeOf<
        IsNextTokenValid<
          Ident<"name", "string">,
          typeof _usersSchema,
          [":", LiteralToken<"t">]
        >
      >().toEqualTypeOf<true>();
    });

    it("should invalidate an identifier followed by an invalid operator", () => {
      expectTypeOf<
        IsNextTokenValid<Ident<"age", "int32">, typeof _usersSchema, [":"]>
      >().toEqualTypeOf<"Invalid token sequence: identifier with name `age` followed by `:`">();
    });
    it("should invalidate an identifier followed by another identifier", () => {
      expectTypeOf<
        IsNextTokenValid<
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
        IsNextTokenValid<")", typeof _usersSchema, ["&&"]>
      >().toEqualTypeOf<true>();
    });

    it("should invalidate a right parenthesis followed by an identifier", () => {
      expectTypeOf<
        IsNextTokenValid<")", typeof _usersSchema, [Ident<"age", "int32">]>
      >().toEqualTypeOf<"Invalid token sequence: `)` followed by identifier">();
    });
  });

  describe("Operators", () => {
    it("should validate an operator followed by a literal token", () => {
      expectTypeOf<
        IsNextTokenValid<":", typeof _usersSchema, [LiteralToken<"John">]>
      >().toEqualTypeOf<true>();
    });

    it("should invalidate an operator followed by another operator", () => {
      expectTypeOf<
        IsNextTokenValid<":", typeof _usersSchema, [":"]>
      >().toEqualTypeOf<"Invalid token sequence: `:` followed by `:`">();
    });
  });

  describe("Logical Operators", () => {
    it("should validate a logical operator followed by a left parenthesis", () => {
      expectTypeOf<
        IsNextTokenValid<"&&", typeof _usersSchema, ["("]>
      >().toEqualTypeOf<true>();
    });

    it("should invalidate a logical operator followed by another logical operator", () => {
      expectTypeOf<
        IsNextTokenValid<"&&", typeof _usersSchema, ["&&"]>
      >().toEqualTypeOf<"Invalid token sequence: `&&` followed by `&&`">();
    });
  });

  describe("Literal Tokens", () => {
    it("should validate a literal token followed by a right parenthesis", () => {
      expectTypeOf<
        IsNextTokenValid<LiteralToken<"John">, typeof _usersSchema, [")"]>
      >().toEqualTypeOf<true>();
    });
    it("should invalidate a literal token followed by an identifier", () => {
      expectTypeOf<
        IsNextTokenValid<
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
        IsNextTokenValid<NumToken<"20">, typeof _usersSchema, [")"]>
      >().toEqualTypeOf<true>();
    });

    it("should invalidate an integer token followed by an identifier", () => {
      expectTypeOf<
        IsNextTokenValid<
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
        IsNextTokenValid<
          Ident<"age", "int32">,
          typeof _usersSchema,
          [":[", NumToken<"20">]
        >
      >().toEqualTypeOf<true>();
    });

    it("should invalidate a left square bracket followed by a right parenthesis", () => {
      expectTypeOf<
        IsNextTokenValid<":[", typeof _usersSchema, [")"]>
      >().toEqualTypeOf<"Invalid token sequence: `:[` followed by `)`">();
    });
  });

  describe("Right Square Bracket", () => {
    it("should validate a right square bracket followed by a logical AND operator", () => {
      expectTypeOf<
        IsNextTokenValid<"]", typeof _usersSchema, ["&&"]>
      >().toEqualTypeOf<true>();
    });

    it("should invalidate a right square bracket followed by an identifier", () => {
      expectTypeOf<
        IsNextTokenValid<"]", typeof _usersSchema, [Ident<"age", "int32">]>
      >().toEqualTypeOf<"Invalid token sequence: `]` followed by identifier">();
    });
  });

  describe("Comma", () => {
    it("should validate a comma followed by an integer token", () => {
      expectTypeOf<
        IsNextTokenValid<",", typeof _usersSchema, [NumToken<"20">]>
      >().toEqualTypeOf<true>();
    });

    it("should invalidate a comma followed by a right parenthesis", () => {
      expectTypeOf<
        IsNextTokenValid<",", typeof _usersSchema, [")"]>
      >().toEqualTypeOf<"Invalid token sequence: `,` followed by `)`">();
    });
  });

  describe("Spread", () => {
    it("should validate a spread operator followed by an integer token", () => {
      expectTypeOf<
        IsNextTokenValid<"..", typeof _usersSchema, [NumToken<"30">]>
      >().toEqualTypeOf<true>();
    });

    it("should invalidate a spread operator followed by a right parenthesis", () => {
      expectTypeOf<
        IsNextTokenValid<"..", typeof _usersSchema, [")"]>
      >().toEqualTypeOf<"Invalid token sequence: `..` followed by `)`">();
    });
  });

  describe("Reference", () => {
    it("should invalidate if the current collection isn't registered", () => {
      expectTypeOf<
        IsNextTokenValid<
          ReferenceToken<"products", "id:*">,
          typeof _unregisteredSchema,
          []
        >
      >().toEqualTypeOf<"Collection `unregistered` not registered">();
    });

    it("should invalidate if the joining collection isn't registered", () => {
      expectTypeOf<
        IsNextTokenValid<
          ReferenceToken<"products", "id:*">,
          typeof _usersSchema,
          []
        >
      >().toEqualTypeOf<"Collection `products` not registered">();
    });

    it("should invalidate if the joining collection isn't referencing the collection", () => {
      expectTypeOf<
        IsNextTokenValid<
          ReferenceToken<"comments", "id:*">,
          typeof _usersSchema,
          []
        >
      >().toEqualTypeOf<"Collection `comments` not referenced in `users`">();
    });

    it("should invalidate if the joining collection isn't parsed correctly", () => {
      expectTypeOf<
        IsNextTokenValid<
          ReferenceToken<"posts", "(id:*">,
          typeof _usersSchema,
          []
        >
      >().toEqualTypeOf<"[Error on filter for joined collection `posts`]: Parentheses are not balanced">();
    });

    it("should validate if the reference is correct", () => {
      expectTypeOf<
        IsNextTokenValid<
          ReferenceToken<"posts", "id:*">,
          typeof _usersSchema,
          []
        >
      >().toEqualTypeOf<true>();
    });

    it("should validate if the nested reference is correct", () => {
      expectTypeOf<
        IsNextTokenValid<
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
    expectTypeOf<CheckSquareBrackets<[":[", "]"]>>().toEqualTypeOf<true>();
    expectTypeOf<
      CheckSquareBrackets<[":[", "(", ")", "]"]>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      CheckSquareBrackets<[":[", ":[", "]", "]"]>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      CheckSquareBrackets<[":[", ":[", ":[", "]", "]", "]"]>
    >().toEqualTypeOf<true>();
  });

  it("should return false for unbalanced square brackets (more opening)", () => {
    expectTypeOf<
      CheckSquareBrackets<[":[", ":[", "]"]>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      CheckSquareBrackets<[":[", ":[", ":[", "]", "]"]>
    >().toEqualTypeOf<false>();
  });

  it("should return false for unbalanced square brackets (more closing)", () => {
    expectTypeOf<
      CheckSquareBrackets<[":[", "]", "]"]>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      CheckSquareBrackets<[":[", ":[", "]", "]", "]"]>
    >().toEqualTypeOf<false>();
  });

  it("should return false for unbalanced square brackets with other tokens", () => {
    expectTypeOf<
      CheckSquareBrackets<[":[", "(", ")"]>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      CheckSquareBrackets<[":[", "(", ")", "]", "]"]>
    >().toEqualTypeOf<false>();
  });

  it("should return true for balanced square brackets with other tokens", () => {
    expectTypeOf<
      CheckSquareBrackets<[":[", "(", ")", ":[", "]", "]"]>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      CheckSquareBrackets<[":[", "(", ")", ":[", ":[", "]", "]", "]"]>
    >().toEqualTypeOf<true>();
  });

  it("should return true for empty token array", () => {
    expectTypeOf<CheckSquareBrackets<[]>>().toEqualTypeOf<true>();
  });
});

describe("IsValidArray tests", () => {
  it("should return true for an empty array", () => {
    expectTypeOf<IsValidArray<[], typeof _usersSchema>>().toEqualTypeOf<true>();
  });

  it("should return false for a single valid token", () => {
    expectTypeOf<
      IsValidArray<["("], typeof _usersSchema>
    >().toEqualTypeOf<"Invalid token sequence: `(` cannot be the only token">();
  });

  it("should return true for a sequence of valid tokens", () => {
    expectTypeOf<
      IsValidArray<
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
      IsValidArray<
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
      IsValidArray<
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
      IsValidArray<
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
      IsValidArray<
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
      IsValidArray<[":=", NumToken<"20">, ")"], typeof _usersSchema>
    >().toEqualTypeOf<"Invalid start token: `:=`">();
  });

  it("should return false for a sequence with an invalid transition", () => {
    expectTypeOf<
      IsValidArray<
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
