import type { Char, Digit, EOF, NumericValue, TokenMap } from "@/lexer/token";

/**
 * Checks if a type is empty.
 * @template T - The type to check.
 */
type IsEmpty<T extends string | unknown[]> =
  T extends "" ? true
  : T["length"] extends 0 ? true
  : false;

/**
 * Gets the tail of a tuple.
 * @template Type - The type of the tuple.
 * @template T - The tuple to get the tail of.
 */
type Tail<Type, T extends Type[]> = T extends [Type, ...infer U] ? U : never;

/**
 * Helper type to check if two tokens are balanced inside a clause.
 * If the stack is non-empty at the end, the tokens are not balanced.
 * @template Token - The type of tokens to check.
 * @template TokenArray - The array of tokens to check.
 * @template Types - A tuple of the types of tokens to check for balance.
 * @template Stack - The stack to keep track of the tokens. Defaults to an empty array.
 */
type CheckBalancedTokens<
  Token,
  TokenArray extends Token[],
  Types extends [Token, Token],
  Stack extends Token[] = [],
> =
  TokenArray extends [infer Head, ...infer Tail] ?
    Head extends Types[0] ?
      CheckBalancedTokens<
        Token,
        Extract<Tail, Token[]>,
        Types,
        [Types[0], ...Stack]
      >
    : Head extends Types[1] ?
      Stack extends [Types[0], ...infer Rest] ?
        CheckBalancedTokens<
          Token,
          Extract<Tail, Token[]>,
          Types,
          Extract<Rest, Token[]>
        >
      : false
    : CheckBalancedTokens<Token, Extract<Tail, Token[]>, Types, Stack>
  : IsEmpty<Stack>;

/**
 * Safely access a key in a record. Useful for avoiding checks in more complex types.
 * @template T - The key to access.
 */
type SafeTokenMapAccess<T> = T extends keyof TokenMap ? TokenMap[T] : never;

/**
 * Reads a string from the input.
 * @template T - The input string to read from.
 * @template Acc - The accumulator for the string, defaults to EOF.
 * @template Rest - The rest of the string after reading, defaults to T.
 * @returns A tuple containing the read string and the remaining string.
 */
type ReadString<
  T extends string,
  Acc extends string = EOF,
  Rest extends string = T,
  FirstCharProcessed extends boolean = false,
> =
  T extends `${infer Head}${infer Tail}` ?
    FirstCharProcessed extends false ?
      // The first char must be a letter or underscore
      Head extends Char ?
        ReadString<Tail, `${Acc}${Head}`, Tail, true>
      : [Acc, Rest]
    : Head extends Char | Digit ? ReadString<Tail, `${Acc}${Head}`, Tail, true>
    : [Acc, Rest]
  : [Acc, Rest];

/**
 * Reads a number from the input string.
 * @template T - The input string to read from.
 * @template Acc - The accumulator for the number, defaults to EOF.
 * @template Rest - The rest of the string after reading, defaults to T.
 * @template DotEncountered - Whether a decimal point has been encountered, defaults to false.
 * @template FirstCharProcessed - Whether the first character has been processed, defaults to false.
 * @returns A tuple containing the read number and the remaining string.
 */
type ReadNum<
  T extends string,
  Acc extends string = EOF,
  Rest extends string = T,
  DotEncountered extends boolean = false,
  FirstCharProcessed extends boolean = false,
> =
  T extends `${infer Head}${infer Tail}` ?
    Head extends NumericValue ?
      Head extends "." ?
        DotEncountered extends true ? [Acc, Rest]
        : FirstCharProcessed extends true ?
          Tail extends `${infer Next}${infer _}` ?
            Next extends Digit ?
              ReadNum<Tail, `${Acc}${Head}`, Tail, true, true>
            : [Acc, `${Head}${Tail}`]
          : [Acc, `${Head}${Tail}`]
        : [Acc, Rest]
      : Head extends "-" ?
        FirstCharProcessed extends true ?
          [Acc, Rest]
        : ReadNum<Tail, `${Acc}${Head}`, Tail, DotEncountered, true>
      : ReadNum<Tail, `${Acc}${Head}`, Tail, DotEncountered, true>
    : [Acc, Rest]
  : [Acc, Rest];

export type {
  CheckBalancedTokens,
  IsEmpty,
  ReadNum,
  ReadString,
  SafeTokenMapAccess,
  Tail,
};
