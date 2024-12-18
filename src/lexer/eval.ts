import type { Collection } from "@/collection/base";
import type { ParseFilter } from "@/lexer/filter";
import type {
  Colon,
  Comma,
  Digit,
  EOF,
  LSquare,
  NumToken,
  RSquare,
  Whitespace,
} from "@/lexer/token";
import type {
  CheckBalancedTokens,
  IsEmpty,
  ReadNum,
  Tail,
} from "@/lexer/types";
import type { OmitDefaultSortingField, Recurse } from "@/lib/utils";

interface FilterClause<C extends string, I extends boolean> {
  type: "filter";
  clause: C;
  in_range: I;
}

type Token =
  | FilterClause<string, boolean>
  | NumToken<string>
  | Colon
  | Comma
  | LSquare
  | RSquare;

type TrimLeft<T extends string> =
  T extends `${Whitespace}${infer Rest}` ? TrimLeft<Rest>
  : T extends `${infer Pre})${Whitespace}:${infer Post}` ? `${Pre}):${Post}`
  : T;

type ReadToken<T extends string> =
  T extends `[${infer Rest}` ? [LSquare, Rest]
  : T extends `]${infer Rest}` ? [RSquare, Rest]
  : T extends `:${infer Rest}` ? [Colon, Rest]
  : T extends `,${infer Rest}` ? [Comma, Rest]
  : T extends `(${infer Clause}):${infer Rest}` ?
    [FilterClause<Clause, true>, Rest]
  : T extends `${Digit}${string}` ?
    ReadNum<T> extends [infer R extends string, infer Rest] ?
      [NumToken<R>, Rest]
    : [EOF, T]
  : T extends `${infer FirstChar}${infer Rest}` ?
    FirstChar extends Whitespace ?
      ReadToken<Rest>
    : [FilterClause<T, false>, EOF]
  : [EOF, T];

type Tokenizer<T extends string, Acc extends Token[] = []> =
  T extends EOF ? Acc
  : T extends `${Whitespace}${infer Rest}` ? Tokenizer<Rest, Acc>
  : ReadToken<TrimLeft<T>> extends (
    [infer TokenType extends Token, infer Rest extends string]
  ) ?
    Rest extends EOF ?
      [...Acc, TokenType]
    : Tokenizer<Rest, [...Acc, TokenType]>
  : Acc;

type IsValidArray<
  TokenArray extends Token[],
  Schema extends OmitDefaultSortingField<Collection>,
  Acc extends Token[] = [],
  FirstTokenProcessed extends boolean = false,
> =
  TokenArray extends [infer Head extends Token, ...infer Tail extends Token[]] ?
    FirstTokenProcessed extends false ?
      // If the first token has not been processed, check if it's a valid start token
      Head extends FilterClause<string, false> | LSquare ?
        IsEmpty<Tail> extends true ?
          Head extends FilterClause<infer Clause, false> ?
            ParseFilter<Clause, Schema> extends infer Result ?
              Result extends true ?
                true
              : `[Error on filter]: ${Result & string}`
            : `[Error on filter]: couldn't parse filter`
          : `Invalid token sequence: ${GetTokenType<Head>} cannot be the only token`
        : IsValidArray<Tail, Schema, [...Acc, Head], true>
      : `Invalid start token: ${GetTokenType<Head>}`
    : IsNextTokenValid<Head, Schema, Tail> extends true ?
      IsValidArray<Tail, Schema, [...Acc, Head], true>
    : IsNextTokenValid<Head, Schema, Tail>
  : IsEmpty<Acc> extends false ?
    IsNextTokenValid<Acc[0], Schema, Tail<Token, Acc>> extends true ?
      true
    : IsNextTokenValid<Acc[0], Schema, Tail<Token, Acc>>
  : true;

type GetTokenType<T extends Token> =
  T extends FilterClause<string, boolean> ? "filter clause"
  : T extends NumToken<string> ? "number"
  : T extends LSquare ? "`[`"
  : T extends RSquare ? "`]`"
  : T extends Colon ? "`:`"
  : T extends Comma ? "`,`"
  : "unknown token";

type IsValidFilterClause<
  Clause extends string,
  Schema extends OmitDefaultSortingField<Collection>,
  TNext extends Token[],
  InRange extends boolean,
> =
  InRange extends true ?
    TNext[0] extends NumToken<string> ?
      ParseFilter<Clause, Schema> extends infer Result ?
        Result extends true ?
          true
        : `[Error on filter]: ${Result & string}`
      : `[Error on filter]: couldn't parse filter`
    : `Invalid token after filter, expected a number`
  : IsEmpty<TNext> extends true ?
    ParseFilter<Clause, Schema> extends infer Result ?
      Result extends true ?
        true
      : `[Error on filter]: ${Result & string}`
    : `[Error on filter]: couldn't parse filter`
  : `Invalid token: a filter must be the only token in _eval`;

type IsValidNumber<TNext extends Token[]> =
  TNext[0] extends Comma | RSquare ? true
  : `Invalid token after number, expected \`,\` or \`]\``;

type IsValidBracket<Current extends LSquare | RSquare, TNext extends Token[]> =
  Current extends LSquare ?
    TNext[0] extends FilterClause<string, true> ?
      true
    : `Invalid token after \`[\`, expected filter`
  : IsEmpty<TNext> extends true ? true
  : TNext[0] extends EOF ? true
  : `Invalid token after \`]\`, expected EOF`;

type IsValidOperator<Current extends Colon | Comma, TNext extends Token[]> =
  Current extends Colon ?
    TNext[0] extends NumToken<string> ?
      true
    : `Invalid token after \`:\`, expected number`
  : TNext[0] extends FilterClause<string, true> ? true
  : `Invalid token after \`,\`, expected filter`;

type IsNextTokenValid<
  Current extends Token,
  Schema extends OmitDefaultSortingField<Collection>,
  TNext extends Token[],
> =
  Current extends FilterClause<infer Clause, infer InRange> ?
    IsValidFilterClause<Clause, Schema, TNext, InRange>
  : Current extends NumToken<string> ? IsValidNumber<TNext>
  : Current extends LSquare | RSquare ? IsValidBracket<Current, TNext>
  : Current extends Colon | Comma ? IsValidOperator<Current, TNext>
  : Current extends string ? `Invalid token: \`${Current}\``
  : "Invalid token";
type CheckSquareBrackets<TokenArray extends Token[]> = CheckBalancedTokens<
  Token,
  TokenArray,
  [LSquare, RSquare]
>;

type Parse<
  T extends string,
  Schema extends OmitDefaultSortingField<Collection>,
> = Recurse<
  Tokenizer<T> extends infer Tokens extends Token[] ?
    // If the tokenizer is successful, check if the tokens are valid
    IsValidArray<Tokens, Schema> extends infer IsValid ?
      IsValid extends true ?
        // If the tokens are valid, check if the parentheses and square brackets are balanced
        CheckSquareBrackets<Tokens> extends true ?
          true
        : "Square brackets are not balanced"
      : IsValid
    : `Invalid token sequence: ${Tokens & string}`
  : Tokenizer<T>
>;

export type {
  FilterClause,
  Tokenizer,
  IsNextTokenValid,
  ReadToken,
  CheckSquareBrackets,
  ReadNum,
  Parse as ParseEval,
};
