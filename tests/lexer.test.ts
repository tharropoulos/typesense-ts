import type { IsEmpty, ReadNum, ReadString } from "@/lexer/types";

import { describe, expectTypeOf, it } from "vitest";

describe("IsEmpty tests", () => {
  it("should return true for an empty string", () => {
    expectTypeOf<IsEmpty<"">>().toEqualTypeOf<true>();
  });

  it("should return true for an empty array", () => {
    expectTypeOf<IsEmpty<[]>>().toEqualTypeOf<true>();
  });

  it("should return 'non-empty' for a non-empty string", () => {
    expectTypeOf<IsEmpty<"non-empty">>().toEqualTypeOf<false>();
  });

  it("should return 'non-empty' for a non-empty array", () => {
    expectTypeOf<IsEmpty<[1, 2, 3]>>().toEqualTypeOf<false>();
  });

  it("should return 'non-empty' for an array with a single element", () => {
    expectTypeOf<IsEmpty<[1]>>().toEqualTypeOf<false>();
  });

  it("should return 'non-empty' for a string with a single character", () => {
    expectTypeOf<IsEmpty<"a">>().toEqualTypeOf<false>();
  });
});

describe("ReadString tests", () => {
  it("should read a continuous string", () => {
    expectTypeOf<ReadString<"Name = John ">>().toEqualTypeOf<
      ["Name", " = John "]
    >();
  });
  it("should read a continuous string with underscores", () => {
    expectTypeOf<ReadString<"_Name_under = John ">>().toEqualTypeOf<
      ["_Name_under", " = John "]
    >();
  });
  it("should read a continuous string with a number after the first char", () => {
    expectTypeOf<ReadString<"N2ame2 = John ">>().toEqualTypeOf<
      ["N2ame2", " = John "]
    >();
  });
  it("should not read a number", () => {
    expectTypeOf<ReadString<"13 name = John ">>().toEqualTypeOf<
      ["", "13 name = John "]
    >();
  });
  it("should not read a whitespace character", () => {
    expectTypeOf<ReadString<" name = John ">>().toEqualTypeOf<
      ["", " name = John "]
    >();
  });
  it("should not read a token character", () => {
    expectTypeOf<ReadString<":> name = John ">>().toEqualTypeOf<
      ["", ":> name = John "]
    >();
  });
  it("should not read a reference", () => {
    expectTypeOf<ReadString<"$products(id:=1) age = 20">>().toEqualTypeOf<
      ["", "$products(id:=1) age = 20"]
    >();
  });
});

describe("ReadNum tests", () => {
  it("should read an integer", () => {
    expectTypeOf<ReadNum<"13 name = John ">>().toEqualTypeOf<
      ["13", " name = John "]
    >();
  });
  it("should not read a string", () => {
    expectTypeOf<ReadNum<"Name = John ">>().toEqualTypeOf<
      ["", "Name = John "]
    >();
  });
  it("should not read a whitespace character", () => {
    expectTypeOf<ReadNum<" 13 name = John ">>().toEqualTypeOf<
      ["", " 13 name = John "]
    >();
  });
  it("should not read a token character", () => {
    expectTypeOf<ReadNum<":> name = John ">>().toEqualTypeOf<
      ["", ":> name = John "]
    >();
  });
  it("should read a floating point number", () => {
    expectTypeOf<ReadNum<"13.5 name = John ">>().toEqualTypeOf<
      ["13.5", " name = John "]
    >();
  });
  it("should read a negative number", () => {
    expectTypeOf<ReadNum<"-13 name = John ">>().toEqualTypeOf<
      ["-13", " name = John "]
    >();
  });
  it("should read a negative floating point number", () => {
    expectTypeOf<ReadNum<"-13.5 name = John ">>().toEqualTypeOf<
      ["-13.5", " name = John "]
    >();
  });
  it("should only read numbers prefixed with a minus sign", () => {
    expectTypeOf<ReadNum<"13- name = John ">>().toEqualTypeOf<
      ["13", "- name = John "]
    >();
  });
  it("should only read floating point numbers that have a fist digit", () => {
    expectTypeOf<ReadNum<".5 name = John ">>().toEqualTypeOf<
      ["", ".5 name = John "]
    >();
  });
  it("should only read floating point numbers with a single dot character", () => {
    expectTypeOf<ReadNum<"13.0.2 name = John ">>().toEqualTypeOf<
      ["13.0", ".2 name = John "]
    >();
  });
  it("should not read a floating point number with a trailing dot character", () => {
    expectTypeOf<ReadNum<"13. name = John ">>().toEqualTypeOf<
      ["13", ". name = John "]
    >();
  });
});
