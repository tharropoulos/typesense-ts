import type {
  ExtractIncludeInfo,
  GetIncludeInfo,
  IncludeFields,
  IncludeReference,
  IncludeWildcard,
  ParseIncludeFields,
  ParseIncludeResult,
  ValidateFields,
  ValidateIncludeFields,
  ValidateIncludeReference,
} from "@/lexer/include";

import { collection } from "@/collection/base";
import { describe, expectTypeOf, it } from "vitest";

const _testSchema = collection({
  name: "test_collection_include",
  fields: [
    { type: "string", optional: false, name: "id" },
    { type: "string", optional: false, name: "name" },
    { type: "int32", optional: false, name: "age" },
  ],
});

const _authorSchema = collection({
  name: "authors_include",
  fields: [
    { type: "string", optional: false, name: "id" },
    { type: "string", optional: false, name: "first_name" },
    { type: "string", optional: false, name: "last_name" },
    { type: "string", optional: true, name: "bio" },
  ],
});

const _usersSchema = collection({
  name: "users_include",
  fields: [
    { type: "string", optional: false, name: "first_name" },
    { type: "string", optional: false, name: "last_name" },
    { type: "string", optional: true, name: "bio" },
    { type: "string", optional: false, name: "name" },
    { type: "int32", optional: false, name: "age", sort: true },
    { type: "string", optional: true, name: "email" },
    { type: "geopoint", name: "location" },
  ],
  default_sorting_field: "age",
});

const _booksSchema = collection({
  name: "books_include",
  fields: [
    { type: "string", optional: false, name: "title" },
    { type: "string", optional: false, name: "content" },
    {
      type: "string",
      optional: false,
      name: "author_id",
      reference: "authors_include.id",
    },
  ],
});

const _postsSchema = collection({
  name: "posts_include",
  fields: [
    { type: "string", optional: false, name: "title" },
    { type: "string", optional: false, name: "content" },
    {
      type: "string",
      optional: false,
      name: "author",
      reference: "authors_include.id",
    },
  ],
});

const _commentsSchema = collection({
  name: "comments_include",
  fields: [
    { type: "string", optional: false, name: "content" },
    {
      type: "string",
      optional: false,
      name: "post",
      reference: "posts_include.id",
    },
    {
      type: "string",
      optional: false,
      name: "author",
      reference: "authors_include.id",
    },
  ],
});

const _unregisteredSchema = collection({
  name: "unregistered",
  fields: [{ type: "string", optional: false, name: "id" }],
});

declare module "@/collection/base" {
  interface GlobalCollections {
    test_collection_include: typeof _testSchema;
    posts_include: typeof _postsSchema;
    authors_include: typeof _authorSchema;
    users_include: typeof _usersSchema;
    books_include: typeof _booksSchema;
    comments_include: typeof _commentsSchema;
  }
}

describe("ValidateIncludeReference tests", () => {
  it("should validate a wildcard reference to a referenced collection", () => {
    expectTypeOf<
      ValidateIncludeReference<typeof _authorSchema, "books_include", "*">
    >().toEqualTypeOf<true>();
  });

  it("should validate specific fields in a referenced collection", () => {
    expectTypeOf<
      ValidateIncludeReference<
        typeof _authorSchema,
        "books_include",
        ["title", "content"]
      >
    >().toEqualTypeOf<true>();
  });

  it("should fail if collection is not referenced", () => {
    expectTypeOf<
      ValidateIncludeReference<typeof _booksSchema, "users_include", "*">
    >().toEqualTypeOf<"Collection 'users_include' is not referenced by 'books_include'">();
  });

  it("should fail if collection is not registered", () => {
    expectTypeOf<
      ValidateIncludeReference<typeof _booksSchema, "unknown_include", "*">
    >().toEqualTypeOf<"Collection 'unknown_include' is not registered">();
  });

  it("should fail if source collection is not registered", () => {
    expectTypeOf<
      ValidateIncludeReference<
        typeof _unregisteredSchema,
        "authors_include",
        "*"
      >
    >().toEqualTypeOf<"Collection 'unregistered' is not registered">();
  });
});

describe("ValidateFields tests", () => {
  it("should validate existing fields", () => {
    expectTypeOf<
      ValidateFields<typeof _authorSchema, ["first_name", "last_name"]>
    >().toEqualTypeOf<true>();
  });

  it("should validate a single existing field", () => {
    expectTypeOf<
      ValidateFields<typeof _authorSchema, ["first_name"]>
    >().toEqualTypeOf<true>();
  });

  it("should validate all existing fields", () => {
    expectTypeOf<
      ValidateFields<
        typeof _authorSchema,
        ["id", "first_name", "last_name", "bio"]
      >
    >().toEqualTypeOf<true>();
  });

  it("should fail on non-existing field", () => {
    expectTypeOf<
      ValidateFields<typeof _authorSchema, ["non_existing_field"]>
    >().toEqualTypeOf<"Field 'non_existing_field' does not exist in collection 'authors_include'">();
  });

  it("should fail on partially invalid fields", () => {
    expectTypeOf<
      ValidateFields<typeof _authorSchema, ["first_name", "invalid_field"]>
    >().toEqualTypeOf<"Field 'invalid_field' does not exist in collection 'authors_include'">();
  });

  it("should validate empty field list", () => {
    expectTypeOf<
      ValidateFields<typeof _authorSchema, []>
    >().toEqualTypeOf<true>();
  });
});

describe("ParseIncludeFields tests", () => {
  it("should parse a valid wildcard include", () => {
    expectTypeOf<
      ParseIncludeFields<"$books_include(*)", typeof _authorSchema>
    >().toEqualTypeOf<true>();
  });

  it("should parse valid specific fields", () => {
    expectTypeOf<
      ParseIncludeFields<"$books_include(title,content)", typeof _authorSchema>
    >().toEqualTypeOf<true>();
  });

  it("should parse multiple valid includes", () => {
    expectTypeOf<
      ParseIncludeFields<
        "$books_include(title,content), $posts_include(title)",
        typeof _authorSchema
      >
    >().toEqualTypeOf<true>();
  });

  it("should handle empty string", () => {
    expectTypeOf<
      ParseIncludeFields<"", typeof _booksSchema>
    >().toEqualTypeOf<true>();
  });

  it("should fail on invalid collection reference", () => {
    expectTypeOf<
      ParseIncludeFields<"$unknown_include(*)", typeof _booksSchema>
    >().toEqualTypeOf<"Collection 'unknown_include' is not registered">();
  });

  it("should fail on non-referenced collection", () => {
    expectTypeOf<
      ParseIncludeFields<"$users_include(*)", typeof _booksSchema>
    >().toEqualTypeOf<"Collection 'users_include' is not referenced by 'books_include'">();
  });

  it("should fail on invalid field names", () => {
    expectTypeOf<
      ParseIncludeFields<"$books_include(invalid_field)", typeof _authorSchema>
    >().toEqualTypeOf<"Field 'invalid_field' does not exist in collection 'books_include'">();
  });

  it("should fail on tokenizer errors", () => {
    expectTypeOf<
      ParseIncludeFields<"$authors_include()", typeof _booksSchema>
    >().toEqualTypeOf<"Empty field list for collection authors_include">();
  });
});

describe("ExtractIncludeInfo tests", () => {
  it("should extract info from wildcard reference", () => {
    expectTypeOf<
      ExtractIncludeInfo<
        [IncludeWildcard<"authors_include">],
        typeof _booksSchema
      >
    >().toEqualTypeOf<
      [
        {
          sourceCollection: "books_include";
          targetCollection: "authors_include";
          fields: "*";
        },
      ]
    >();
  });

  it("should extract info from specific fields reference", () => {
    expectTypeOf<
      ExtractIncludeInfo<
        [IncludeReference<"authors_include", ["first_name", "last_name"]>],
        typeof _booksSchema
      >
    >().toEqualTypeOf<
      [
        {
          sourceCollection: "books_include";
          targetCollection: "authors_include";
          fields: ["first_name", "last_name"];
        },
      ]
    >();
  });

  it("should extract info from multiple references", () => {
    expectTypeOf<
      ExtractIncludeInfo<
        [
          IncludeWildcard<"authors_include">,
          ",",
          IncludeReference<"posts_include", ["title"]>,
        ],
        typeof _usersSchema
      >
    >().toEqualTypeOf<
      [
        {
          sourceCollection: "users_include";
          targetCollection: "authors_include";
          fields: "*";
        },
        {
          sourceCollection: "users_include";
          targetCollection: "posts_include";
          fields: ["title"];
        },
      ]
    >();
  });

  it("should filter out comma tokens", () => {
    expectTypeOf<
      ExtractIncludeInfo<
        [IncludeWildcard<"authors_include">, ","],
        typeof _booksSchema
      >
    >().toEqualTypeOf<
      [
        {
          sourceCollection: "books_include";
          targetCollection: "authors_include";
          fields: "*";
        },
      ]
    >();
  });

  it("should handle empty token array", () => {
    expectTypeOf<ExtractIncludeInfo<[], typeof _booksSchema>>().toEqualTypeOf<
      []
    >();
  });
});

describe("ParseIncludeResult tests", () => {
  it("should return valid result for correct include fields", () => {
    type Result = ParseIncludeResult<"$books_include(*)", typeof _authorSchema>;

    expectTypeOf<Result["isValid"]>().toEqualTypeOf<true>();
    expectTypeOf<Result["includes"]>().toEqualTypeOf<
      [
        {
          sourceCollection: "authors_include";
          targetCollection: "books_include";
          fields: "*";
        },
      ]
    >();
  });

  it("should return invalid result for incorrect include fields", () => {
    type Result = ParseIncludeResult<"$unknown(*)", typeof _booksSchema>;

    expectTypeOf<Result["isValid"]>().toEqualTypeOf<false>();
    expectTypeOf<
      Result["errors"]
    >().toEqualTypeOf<"Collection 'unknown' is not registered">();
    expectTypeOf<Result["includes"]>().toEqualTypeOf<[]>();
  });

  it("should handle multiple valid includes", () => {
    type Result = ParseIncludeResult<
      "$books_include(title,content), $posts_include(title)",
      typeof _authorSchema
    >;

    expectTypeOf<Result["isValid"]>().toEqualTypeOf<true>();
    expectTypeOf<Result["includes"]>().toEqualTypeOf<
      [
        {
          sourceCollection: "authors_include";
          targetCollection: "books_include";
          fields: ["title", "content"];
        },
        {
          sourceCollection: "authors_include";
          targetCollection: "posts_include";
          fields: ["title"];
        },
      ]
    >();
  });

  it("should handle empty include fields", () => {
    type Result = ParseIncludeResult<"", typeof _booksSchema>;

    expectTypeOf<Result["isValid"]>().toEqualTypeOf<true>();
    expectTypeOf<Result["includes"]>().toEqualTypeOf<[]>();
  });
});

describe("Real-world use cases", () => {
  it("should handle the books-authors example from documentation", () => {
    expectTypeOf<
      ParseIncludeFields<"$books_include(title,content)", typeof _authorSchema>
    >().toEqualTypeOf<true>();

    expectTypeOf<
      ParseIncludeFields<"$books_include(*)", typeof _authorSchema>
    >().toEqualTypeOf<true>();
  });

  it("should handle authors querying books with wildcard", () => {
    expectTypeOf<
      ParseIncludeFields<"$books_include(*)", typeof _authorSchema>
    >().toEqualTypeOf<true>();
  });

  it("should handle complex multi-collection includes", () => {
    expectTypeOf<
      ParseIncludeFields<
        "$posts_include(title,content), $comments_include(content)",
        typeof _authorSchema
      >
    >().toEqualTypeOf<true>();
  });

  it("should handle complex multi-collection includes with wildcard", () => {
    expectTypeOf<
      ParseIncludeFields<
        "$posts_include(*), $comments_include(*)",
        typeof _authorSchema
      >
    >().toEqualTypeOf<true>();
  });

  it("should handle complex multi-collection includes with nested wildcard", () => {
    expectTypeOf<
      ParseIncludeFields<
        "$posts_include(title,content,$comments_include(*))",
        typeof _authorSchema
      >
    >().toEqualTypeOf<true>();
  });

  it("should validate field existence in complex scenarios", () => {
    expectTypeOf<
      ParseIncludeFields<
        "$books_include(title,invalid_field)",
        typeof _authorSchema
      >
    >().toEqualTypeOf<"Field 'invalid_field' does not exist in collection 'books_include'">();
  });
});

describe("Enhanced IncludeFields tests", () => {
  it("should handle string parsing with IncludeFields", () => {
    expectTypeOf<
      IncludeFields<"$books_include(*)", typeof _authorSchema>
    >().toEqualTypeOf<
      [
        "books_include.id",
        "books_include.title",
        "books_include.content",
        "books_include.author_id",
      ]
    >();

    expectTypeOf<
      IncludeFields<"$books_include(title,content)", typeof _authorSchema>
    >().toEqualTypeOf<["books_include.title", "books_include.content"]>();
  });

  it("should handle multiple includes", () => {
    expectTypeOf<
      IncludeFields<
        "$books_include(title,content), $posts_include(title)",
        typeof _authorSchema
      >
    >().toEqualTypeOf<
      ["books_include.title", "books_include.content", "posts_include.title"]
    >();
  });

  it("should handle nested collection references", () => {
    expectTypeOf<
      IncludeFields<
        "$posts_include(title,content,$comments_include(content,id))",
        typeof _authorSchema
      >
    >().toEqualTypeOf<
      [
        "posts_include.title",
        "posts_include.content",
        "posts_include.comments_include.content",
        "posts_include.comments_include.id",
      ]
    >();

    expectTypeOf<
      IncludeFields<
        "$posts_include(title,content,$comments_include(*))",
        typeof _authorSchema
      >
    >().toEqualTypeOf<
      [
        "posts_include.title",
        "posts_include.content",
        "posts_include.comments_include.id",
        "posts_include.comments_include.content",
        "posts_include.comments_include.post",
        "posts_include.comments_include.author",
      ]
    >();
  });

  it("should validate include fields for strings", () => {
    expectTypeOf<
      ValidateIncludeFields<"$books_include(*)", typeof _authorSchema>
    >().toEqualTypeOf<true>();

    expectTypeOf<
      ValidateIncludeFields<"$invalid_collection(*)", typeof _authorSchema>
    >().toEqualTypeOf<"Collection 'invalid_collection' is not registered">();
  });

  it("should validate include fields for schemas", () => {
    expectTypeOf<
      ValidateIncludeFields<typeof _booksSchema, typeof _authorSchema>
    >().toEqualTypeOf<true>();
  });

  it("should get include info from string parsing", () => {
    expectTypeOf<
      GetIncludeInfo<"$books_include(*)", typeof _authorSchema>
    >().toEqualTypeOf<
      [
        {
          sourceCollection: "authors_include";
          targetCollection: "books_include";
          fields: "*";
        },
      ]
    >();
  });

  it("should get include info from schema", () => {
    expectTypeOf<
      GetIncludeInfo<typeof _booksSchema, typeof _authorSchema>
    >().toEqualTypeOf<
      [
        {
          sourceCollection: "authors_include";
          targetCollection: "books_include";
          fields: ("id" | "title" | "content" | "author_id")[];
        },
      ]
    >();
  });
});
