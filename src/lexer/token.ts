import type { FieldType } from "@/collection/base";

interface DigitMap {
  0: "0";
  1: "1";
  2: "2";
  3: "3";
  4: "4";
  5: "5";
  6: "6";
  7: "7";
  8: "8";
  9: "9";
}

interface CharMap {
  a: "a";
  b: "b";
  c: "c";
  d: "d";
  e: "e";
  f: "f";
  g: "g";
  h: "h";
  i: "i";
  j: "j";
  k: "k";
  l: "l";
  m: "m";
  n: "n";
  o: "o";
  p: "p";
  q: "q";
  r: "r";
  s: "s";
  t: "t";
  u: "u";
  v: "v";
  w: "w";
  x: "x";
  y: "y";
  z: "z";
  A: "A";
  B: "B";
  C: "C";
  D: "D";
  E: "E";
  F: "F";
  G: "G";
  H: "H";
  I: "I";
  J: "J";
  K: "K";
  L: "L";
  M: "M";
  N: "N";
  O: "O";
  P: "P";
  Q: "Q";
  R: "R";
  S: "S";
  T: "T";
  U: "U";
  V: "V";
  W: "W";
  X: "X";
  Y: "Y";
  Z: "Z";
  _: "_";
  "*": "*";
  "-": "-";
}

type Char = CharMap[keyof CharMap];

type Digit = DigitMap[keyof DigitMap];

type LParen = "(";
type RParen = ")";
type LSquare = "[";
type LSquarePrefixed = ":[";
type NLSquarePrefixed = ":!=[";
type RSquare = "]";
type LAnd = "&&";
type LOr = "||";
type LT = ":<";
type GT = ":>";
type EQ = ":=";
type GTE = ":>=";
type LTE = ":<=";
type NEQ = ":!=";
type Colon = ":";
type Bang = ":!";
type Spread = "..";
type BrGT = ">";
type BrLT = "<";
type Comma = ",";
type Join = "$";
type EOF = "";
type Whitespace = " ";

type NumericValue = Digit | "." | "-";

type Asc = "asc";
type Desc = "desc";

type SortOrder = Asc | Desc;

/**
 * Represents a literal token with a string value.
 * @template T - The type of the literal value.
 */
interface LiteralToken<T extends string> {
  type: "literal";
  value: T;
}

/**
 * Represents an identifier with a name and type.
 * @template Name - The name of the identifier.
 * @template TType - The type of the identifier, must extend FieldType.
 */
interface Ident<Name extends string, Type extends FieldType> {
  name: Name;
  type: Type;
}

/**
 * Represents a numeric token with a string value.
 * @template N - The type of the numeric value.
 */
interface NumToken<N extends string> {
  type: "int";
  value: N;
}

/**
 * Represents a reference token for joining collections.
 * @template T - The name of the collection being referenced.
 * @template C - The filter clause for the join, defaults to string.
 */
interface ReferenceToken<T extends string, C extends string = string> {
  type: "reference";
  collection: T;
  clause: C;
}

/**
 * Maps token literals to their respective types.
 */
interface TokenMap {
  "&&": LAnd;
  "||": LOr;
  ":=": EQ;
  ":>": GT;
  ":<": LT;
  ":<=": LTE;
  ":>=": GTE;
  ":!=": NEQ;
  ":!": Bang;
  ":": Colon;
  "(": LParen;
  ")": RParen;
  ":[": LSquarePrefixed;
  "<": BrLT;
  ">": BrGT;
  "]": RSquare;
  "..": Spread;
  ",": Comma;
  $: Join;
}

export type {
  Asc,
  Bang,
  BrGT,
  BrLT,
  Char,
  Colon,
  Comma,
  Desc,
  Digit,
  EOF,
  EQ,
  GT,
  GTE,
  Ident,
  Join,
  LAnd,
  LiteralToken,
  LOr,
  LParen,
  LSquare,
  LSquarePrefixed,
  NLSquarePrefixed,
  LT,
  LTE,
  NEQ,
  NumericValue,
  NumToken,
  ReferenceToken,
  RParen,
  RSquare,
  SortOrder,
  Spread,
  TokenMap,
  Whitespace,
};
