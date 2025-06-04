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
  TupleTail,
} from "@/lexer/types";
import type { OmitDefaultSortingField, Recurse } from "@/lib/utils";

interface FilterClause<C extends string, I extends boolean> {
  type: "filter";
  clause: C;
  in_range: I;
}

type EvalToken =
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

type ReadEvalToken<T extends string> =
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
      ReadEvalToken<Rest>
    : [FilterClause<T, false>, EOF]
  : [EOF, T];

type Tokenizer<T extends string, Acc extends EvalToken[] = []> =
  T extends EOF ? Acc
  : T extends `${Whitespace}${infer Rest}` ? Tokenizer<Rest, Acc>
  : ReadEvalToken<TrimLeft<T>> extends (
    [infer TokenType extends EvalToken, infer Rest extends string]
  ) ?
    Rest extends EOF ?
      [...Acc, TokenType]
    : Tokenizer<Rest, [...Acc, TokenType]>
  : Acc;

type IsValidEvalArray<
  TokenArray extends EvalToken[],
  Schema extends OmitDefaultSortingField<Collection>,
  Acc extends EvalToken[] = [],
  FirstTokenProcessed extends boolean = false,
> =
  TokenArray extends (
    [infer Head extends EvalToken, ...infer Tail extends EvalToken[]]
  ) ?
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
          : `Invalid token sequence: ${GetEvalTokenType<Head>} cannot be the only token`
        : IsValidEvalArray<Tail, Schema, [...Acc, Head], true>
      : `Invalid start token: ${GetEvalTokenType<Head>}`
    : IsNextEvalTokenValid<Head, Schema, Tail> extends true ?
      IsValidEvalArray<Tail, Schema, [...Acc, Head], true>
    : IsNextEvalTokenValid<Head, Schema, Tail>
  : IsEmpty<Acc> extends false ?
    IsNextEvalTokenValid<Acc[0], Schema, TupleTail<EvalToken, Acc>> extends (
      true
    ) ?
      true
    : IsNextEvalTokenValid<Acc[0], Schema, TupleTail<EvalToken, Acc>>
  : true;

type GetEvalTokenType<T extends EvalToken> =
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
  TNext extends EvalToken[],
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

type IsValidNumber<TNext extends EvalToken[]> =
  TNext[0] extends Comma | RSquare ? true
  : `Invalid token after number, expected \`,\` or \`]\``;

type IsValidBracket<
  Current extends LSquare | RSquare,
  TNext extends EvalToken[],
> =
  Current extends LSquare ?
    TNext[0] extends FilterClause<string, true> ?
      true
    : `Invalid token after \`[\`, expected filter`
  : IsEmpty<TNext> extends true ? true
  : TNext[0] extends EOF ? true
  : `Invalid token after \`]\`, expected EOF`;

type IsValidOperator<Current extends Colon | Comma, TNext extends EvalToken[]> =
  Current extends Colon ?
    TNext[0] extends NumToken<string> ?
      true
    : `Invalid token after \`:\`, expected number`
  : TNext[0] extends FilterClause<string, true> ? true
  : `Invalid token after \`,\`, expected filter`;

type IsNextEvalTokenValid<
  Current extends EvalToken,
  Schema extends OmitDefaultSortingField<Collection>,
  TNext extends EvalToken[],
> =
  Current extends FilterClause<infer Clause, infer InRange> ?
    IsValidFilterClause<Clause, Schema, TNext, InRange>
  : Current extends NumToken<string> ? IsValidNumber<TNext>
  : Current extends LSquare | RSquare ? IsValidBracket<Current, TNext>
  : Current extends Colon | Comma ? IsValidOperator<Current, TNext>
  : Current extends string ? `Invalid token: \`${Current}\``
  : "Invalid token";

type CheckEvalSquareBrackets<TokenArray extends EvalToken[]> =
  CheckBalancedTokens<EvalToken, TokenArray, [LSquare, RSquare]>;

type ParseEval<
  T extends string,
  Schema extends OmitDefaultSortingField<Collection>,
> = Recurse<
  Tokenizer<T> extends infer Tokens extends EvalToken[] ?
    // If the tokenizer is successful, check if the tokens are valid
    IsValidEvalArray<Tokens, Schema> extends infer IsValid ?
      IsValid extends true ?
        // If the tokens are valid, check if the parentheses and square brackets are balanced
        CheckEvalSquareBrackets<Tokens> extends true ?
          true
        : "Square brackets are not balanced"
      : IsValid
    : `Invalid token sequence: ${Tokens & string}`
  : Tokenizer<T>
>;

export type {
  FilterClause,
  Tokenizer,
  IsNextEvalTokenValid,
  ReadEvalToken,
  CheckEvalSquareBrackets,
  ReadNum,
  ParseEval,
};
