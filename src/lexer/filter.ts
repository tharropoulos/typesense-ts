import type {
  CheckReferences,
  Collection,
  CollectionField,
  FieldType,
  FieldTypeMap,
  GlobalCollections,
} from "@/collection/base";
import type {
  Bang,
  BrGT,
  BrLT,
  Char,
  Colon,
  Comma,
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
  LSquarePrefixed,
  LT,
  LTE,
  NEQ,
  NumericValue,
  NumToken,
  ReferenceToken,
  RParen,
  RSquare,
  Spread,
  TokenMap,
} from "@/lexer/token";
import type {
  CheckBalancedTokens,
  IsEmpty,
  ReadNum,
  ReadString,
  SafeTokenMapAccess,
  Tail,
} from "@/lexer/types";
import type { OmitDefaultSortingField } from "@/lib/utils";

/**
 * All the possible tokens.
 */
type Token =
  | LParen
  | RParen
  | LAnd
  | LOr
  | LT
  | GT
  | EQ
  | GTE
  | LTE
  | NEQ
  | LSquarePrefixed
  | RSquare
  | Colon
  | Bang
  | BrGT
  | BrLT
  | Spread
  | Comma
  | Join
  | Ident<string, FieldType>
  | NumToken<string>
  | LiteralToken<string>
  | ReferenceToken<string>;

/**
 * Reads an escape token, denoted by backticks from the input string.
 * @template T - The input string to read from.
 * @template Acc - The accumulator for the token, defaults to an empty string.
 * @template Rest - The rest of the string after reading, defaults to T.
 * @returns A tuple containing the read escape token and the remaining string.
 */
type ReadEscapeToken<
  T extends string,
  Acc extends string = "",
  Rest extends string = T,
> =
  T extends `\`${infer Content}\`${infer Tail}` ? [Content, Tail] : [Acc, Rest];

/**
 * Converts a number to a tuple of ones. Used for adding and subtracting numbers.
 * @template T - The number to convert to a tuple.
 */
type NumberToTuple<T extends number, R extends unknown[] = []> =
  R["length"] extends T ? R : NumberToTuple<T, [...R, 1]>;

/**
 * Add one to a number. Needed for traversing through nested parentheses.
 * @template T - The number to add one to.
 */
type AddOne<T extends number> = [1, ...NumberToTuple<T>]["length"];

/**
 * Subtract one from a number. Needed for traversing through nested parentheses.
 */
type SubtractOne<T extends number> =
  NumberToTuple<T> extends [unknown, ...infer Rest] ? Rest["length"] : 0;

/**
 * Reads a nested reference token, handling multiple levels of joins.
 * @template T - The input string to read from.
 * @template Collection - The current collection being processed.
 * @template Clause - The current clause being built.
 * @template Depth - The current depth of nested parentheses.
 */
type ReadNestedReferenceToken<
  T extends string,
  Collection extends string,
  Clause extends string = "",
  Depth extends number = 0,
> =
  T extends `(${infer Rest}` ?
    ReadNestedReferenceToken<
      Rest,
      Collection,
      `${Clause}(`,
      AddOne<Depth> & number
    >
  : T extends `)${infer Rest}` ?
    Depth extends 0 ?
      [ReferenceToken<Collection, Clause>, Rest]
    : ReadNestedReferenceToken<
        Rest,
        Collection,
        `${Clause})`,
        SubtractOne<Depth>
      >
  : T extends `${infer Char}${infer Rest}` ?
    ReadNestedReferenceToken<Rest, Collection, `${Clause}${Char}`, Depth>
  : [ReferenceToken<Collection, Clause>, ""];

/**
 * Reads a token from the input string, supporting nested reference tokens.
 * @template T - The input string to read from.
 * @template Acc - The accumulator for the token, defaults to EOF.
 * @template Rest - The rest of the string after reading the token, defaults to T.
 * @returns A tuple containing the read token and the remaining string.
 */
type ReadToken<
  T extends string,
  Acc extends string = EOF,
  Rest extends string = T,
> =
  T extends `$${infer Collection}(${infer Rest}` ?
    ReadNestedReferenceToken<Rest, Collection>
  : T extends `${infer Head1}${infer Head2}${infer Head3}${infer Tail3}` ?
    `${Head1}${Head2}${Head3}` extends keyof TokenMap ?
      [SafeTokenMapAccess<`${Head1}${Head2}${Head3}`>, Tail3]
    : T extends `${infer Head1}${infer Head2}${infer Tail2}` ?
      `${Head1}${Head2}` extends keyof TokenMap ?
        [SafeTokenMapAccess<`${Head1}${Head2}`>, Tail2]
      : T extends `${infer Head}${infer Tail}` ?
        Head extends keyof TokenMap ?
          [SafeTokenMapAccess<Head>, Tail]
        : [Acc, Rest]
      : [Acc, Rest]
    : [Acc, Rest]
  : [Acc, Rest];

type ExtractFields<T> =
  T extends { fields: infer F } ?
    F extends CollectionField[] ?
      F
    : never
  : never;

/**
 * Checks if a type is a valid token.
 * @template T - The token to check.
 * @template Schema - The collection schema to use for validation.
 * @template TNext - The next token to check.
 */
interface OperatorMap<Schema extends OmitDefaultSortingField<Collection>> {
  "(": {
    valid: Extract<Token, ValidNextTokenMap<ExtractFields<Schema>>["("]>;
    empty: false;
  };
  ")": {
    valid: Extract<Token, ValidNextTokenMap<ExtractFields<Schema>>[")"]>;
    empty: true;
  };
  ":<": { valid: LiteralToken<string> | NumToken<string>; empty: false };
  ":>": { valid: LiteralToken<string> | NumToken<string>; empty: false };
  ":=": { valid: LiteralToken<string> | NumToken<string>; empty: false };
  ":>=": { valid: LiteralToken<string> | NumToken<string>; empty: false };
  ":<=": { valid: LiteralToken<string> | NumToken<string>; empty: false };
  "!=": { valid: LiteralToken<string> | NumToken<string>; empty: false };
  ":": { valid: LiteralToken<string> | NumToken<string>; empty: false };
  "&&": {
    valid: LParen | Ident<string, FieldType> | ReferenceToken<string, string>;
    empty: false;
  };
  "||": { valid: LParen | Ident<string, FieldType>; empty: false };
  ":[": {
    valid: NumToken<string> | BrGT | BrLT | LiteralToken<string>;
    empty: false;
  };
  "]": { valid: LAnd | LOr | RParen; empty: true };
  ">": { valid: NumToken<string>; empty: false };
  "<": { valid: NumToken<string>; empty: false };
  "..": { valid: NumToken<string>; empty: false };
  ",": {
    valid: NumToken<string> | BrGT | BrLT | LiteralToken<string>;
    empty: false;
  };
}

/**
 * Tokenizes a string into an array of tokens based on the given collection schema.
 * @template T - The input string to tokenize.
 * @template Schema - The collection schema used for tokenization.
 * @template Acc - The accumulator for tokens, defaults to an empty array.
 * @returns An array of Token objects.
 */
type Tokenizer<
  T extends string,
  Schema extends OmitDefaultSortingField<Collection>,
  Acc extends Token[] = [],
> =
  T extends EOF ?
    // If the string is empty, return the accumulated tokens
    Acc
  : T extends `\`${string}\`${string}` ?
    // If the is encapsulated in backticks, treat it as an escape token
    ReadEscapeToken<T>[0] extends string ?
      Tokenizer<
        ReadEscapeToken<T>[1],
        Schema,
        [...Acc, LiteralToken<ReadEscapeToken<T>[0]>]
      >
    : never
  : ReadToken<T>[0] extends Token ?
    // If the token is a valid token, add it to the accumulator and continue
    Tokenizer<ReadToken<T>[1], Schema, [...Acc, ReadToken<T>[0]]>
  : T extends `${infer Head}${infer Tail}` ?
    // If the token is a string, number, or identifier, parse it and continue
    Head extends keyof TokenMap ?
      Tokenizer<Tail, Schema, [...Acc, TokenMap[Head]]>
    : Head extends " " ? Tokenizer<Tail, Schema, Acc>
    : Head extends Char ?
      ReadString<T>[0] extends keyof FieldTypeMap<Schema> ?
        Tokenizer<
          ReadString<T>[1],
          Schema,
          [
            ...Acc,
            Ident<ReadString<T>[0], FieldTypeMap<Schema>[ReadString<T>[0]]>,
          ]
        >
      : Tokenizer<
          ReadString<T>[1],
          Schema,
          [...Acc, LiteralToken<ReadString<T>[0]>]
        >
    : Head extends NumericValue ?
      Tokenizer<ReadNum<T>[1], Schema, [...Acc, NumToken<ReadNum<T>[0]>]>
    : `Unknown token: ${Head}`
  : T extends keyof TokenMap ?
    // Handle case when the last token is a symbol (e.g. "&&")
    [...Acc, TokenMap[T]]
  : Acc;

/**
 * Maps field names to their types for a given collection schema.
 */
interface TypeToOperatorMap {
  string: EQ | Colon | NEQ | LSquarePrefixed;
  int32: LT | GT | EQ | GTE | LTE | NEQ | LSquarePrefixed;
  int64: LT | GT | EQ | GTE | LTE | NEQ | LSquarePrefixed;
  float: LT | GT | EQ | GTE | LTE | NEQ | LSquarePrefixed;
  bool: EQ | NEQ;
  "int32[]": LT | GT | EQ;
  "int64[]": LT | GT | EQ;
  "float[]": LT | GT | EQ;
  "bool[]": EQ;
}

/**
 * Maps valid tokens that can follow a parenthesis.
 */
interface ValidNextParenMap {
  "(": Ident<string, FieldType> | LParen;
  ")": RParen | LAnd | LOr;
}

/**
 * Maps valid tokens that can follow an operator.
 * @template T - The fields of the collection schema to map.
 */
type ValidNextOperatorMap<T extends CollectionField[]> = {
  [K in T[number]["name"]]: Extract<T[number], { name: K }>["type"] extends (
    keyof TypeToOperatorMap
  ) ?
    TypeToOperatorMap[Extract<T[number], { name: K }>["type"] &
      keyof TypeToOperatorMap]
  : never;
};

/**
 * Intersection of valid tokens that can follow a parenthesis and an operator.
 * @template T - The fields of the collection schema to map.
 */
type ValidNextTokenMap<T extends CollectionField[]> = ValidNextParenMap &
  ValidNextOperatorMap<T>;

/**
 * Checks if the next token after a Number of Literal Token is a valid value.
 * @template TCurrent - The token to check.
 * @template TNext - The following tokens.
 */
type IsValidValue<
  TCurrent extends NumToken<string> | LiteralToken<string>,
  TNext extends Token[],
> =
  TNext[0] extends (
    | RParen
    | LAnd
    | LOr
    | Comma
    | (TCurrent extends NumToken<string> ? Spread | RSquare : RSquare)
  ) ?
    true
  : IsEmpty<TNext> extends true ? true
  : `Invalid token sequence: ${TCurrent extends NumToken<string> ?
      `Num Token \`${TCurrent["value"]}`
    : `Literal Token \`${TCurrent["value"]}`}\` followed by ${GetTokenType<TNext[0]>}`;

/**
 * Checks if the next token after an identifier is a valid identifier.
 * @template CurrentToken - The identifier to check.
 * @template Fields - The fields of the collection schema.
 * @template NextToken - The following tokens.
 */
type IsValidIdentifier<
  CurrentToken extends Ident<string, FieldType>,
  Fields extends CollectionField[],
  NextToken extends Token[],
> =
  NextToken[0] extends ValidNextTokenMap<Fields>[CurrentToken["name"]] ? true
  : `Invalid token sequence: identifier with name \`${CurrentToken["name"]}\` followed by ${GetTokenType<
      NextToken[0]
    >}`;

/**
 * Checks if the next token after an operator is a valid operator.
 * @template T - The operator to check.
 * @template Schema - The fields of the collection schema.
 * @template TNext - The following tokens.
 */
type IsValidToken<
  T extends keyof OperatorMap<Schema>,
  Schema extends OmitDefaultSortingField<Collection>,
  TNext extends Token[],
> =
  OperatorMap<Schema>[T] extends { valid: infer V; empty: infer E } ?
    TNext[0] extends V ? true
    : E extends true ?
      IsEmpty<TNext> extends true ?
        true
      : `Invalid token sequence: \`${T}\` followed by ${GetTokenType<TNext[0]>}`
    : `Invalid token sequence: \`${T}\` followed by ${GetTokenType<TNext[0]>}`
  : never;

/**
 * Checks if the join is valid and if the next token after a join is a valid token.
 * @template Schema - The collection schema to check.
 * @template JoinedCollectionName - The name of the joined collection.
 * @template JoinClause - The clause for the join.
 * @template TNext - The following tokens.
 */
type IsValidJoin<
  Schema extends OmitDefaultSortingField<Collection>,
  JoinedCollectionName extends string,
  JoinClause extends string,
  TNext extends Token[],
> =
  Schema["name"] extends keyof CheckReferences ?
    JoinedCollectionName extends keyof GlobalCollections ?
      JoinedCollectionName extends CheckReferences[Schema["name"]] ?
        Parse<JoinClause, GlobalCollections[JoinedCollectionName]> extends (
          string
        ) ?
          `[Error on filter for joined collection \`${JoinedCollectionName}\`]: ${Parse<
            JoinClause,
            GlobalCollections[JoinedCollectionName]
          >}`
        : TNext[0] extends LOr | LAnd ? true
        : IsEmpty<TNext> extends true ? true
        : `Invalid token sequence: ${GetTokenType<TNext[0]>} cannot be the next token after a join`
      : `Collection \`${JoinedCollectionName}\` not referenced in \`${Schema["name"]}\``
    : `Collection \`${JoinedCollectionName}\` not registered`
  : `Collection \`${Schema["name"]}\` not registered`;

/**
 * Checks if the next token after a token is valid.
 * @template Current - The current token to check.
 * @template Schema - The collection schema to use for validation.
 * @template TNext - The next token to check.
 */
type IsNextTokenValid<
  Current extends Token,
  Schema extends OmitDefaultSortingField<Collection>,
  TNext extends Token[],
> =
  Current extends NumToken<string> | LiteralToken<string> ?
    IsValidValue<Current, TNext>
  : Current extends Ident<string, FieldType> ?
    IsValidIdentifier<Current, ExtractFields<Schema>, TNext>
  : Current extends keyof OperatorMap<Schema> ?
    IsValidToken<Current, Schema, TNext>
  : Current extends ReferenceToken<infer Collection, infer Clause> ?
    IsValidJoin<Schema, Collection, Clause, TNext>
  : `Invalid token sequence: Unknown token followed by \`${GetTokenType<TNext[0]>}\``;

/**
 * Helper type for valid starting tokens.
 */
type ValidStarts =
  | LParen
  | Ident<string, FieldType>
  | NumToken<string>
  | LiteralToken<string>
  | ReferenceToken<string>;

/**
 * Checks if an array of tokens is valid.
 * @template TokenArray - The array of tokens to check.
 * @template Schema - The collection schema to use for validation.
 * @template Acc - The accumulator for the tokens.
 * @template FirstTokenProcessed - Whether the first token has been processed.
 */
type IsValidArray<
  TokenArray extends Token[],
  Schema extends OmitDefaultSortingField<Collection>,
  Acc extends Token[] = [],
  FirstTokenProcessed extends boolean = false,
> =
  TokenArray extends [infer Head extends Token, ...infer Tail extends Token[]] ?
    FirstTokenProcessed extends false ?
      // If the first token has not been processed, check if it's a valid start token
      Head extends ValidStarts ?
        IsEmpty<Tail> extends true ?
          // If it's the only token, check if it's a valid reference token
          Head extends ReferenceToken<string> ?
            IsValidJoin<Schema, Head["collection"], Head["clause"], []>
          : `Invalid token sequence: ${GetTokenType<Head>} cannot be the only token`
        : IsValidArray<Tail, Schema, [...Acc, Head], true>
      : // If it doesn't have a valid start token, return an error
        `Invalid start token: ${GetTokenType<Head>}`
    : IsNextTokenValid<Head, Schema, Tail> extends true ?
      IsValidArray<Tail, Schema, [...Acc, Head], true>
    : IsNextTokenValid<Head, Schema, Tail>
  : IsEmpty<Acc> extends false ?
    IsNextTokenValid<Acc[0], Schema, Tail<Token, Acc>> extends true ?
      true
    : IsNextTokenValid<Acc[0], Schema, Tail<Token, Acc>>
  : true;

// Why a ternary as opposed to a map? Typescript doesn't support mapping over type aliases
/**
 * Gets the type of a token. Used for returning errors in the parser.
 * @template T - The token to get the type of.
 * @returns The type of the token.
 */
type GetTokenType<T extends Token> =
  T extends NumToken<string> ? "num token"
  : T extends LiteralToken<string> ? "literal token"
  : T extends Ident<string, FieldType> ? "identifier"
  : T extends LParen ? "`(`"
  : T extends RParen ? "`)`"
  : T extends LAnd ? "`&&`"
  : T extends LOr ? "`||`"
  : T extends Comma ? "`,`"
  : T extends Spread ? "`..`"
  : T extends RSquare ? "`]`"
  : T extends BrGT ? "`>`"
  : T extends BrLT ? "`<`"
  : T extends ReferenceToken<string, string> ? "join to another collection"
  : T extends keyof OperatorMap<OmitDefaultSortingField<Collection>> ?
    `\`${T}\``
  : "Unknown";

/**
 * Checks if parentheses are balanced in a clause.
 * @template TokenArray - The array of tokens to check.
 */
type CheckParentheses<TokenArray extends Token[]> = CheckBalancedTokens<
  Token,
  TokenArray,
  [LParen, RParen]
>;

/**
 * Checks if square brackets are balanced in a clause.
 */
type CheckSquareBrackets<TokenArray extends Token[]> = CheckBalancedTokens<
  Token,
  TokenArray,
  [LSquarePrefixed, RSquare]
>;

/**
 * Parses a string into a filter clause.
 * @template T - The input string to parse.
 * @template Schema - The collection schema to use for parsing.
 */
type Parse<
  T extends string,
  Schema extends OmitDefaultSortingField<Collection>,
> =
  Tokenizer<T, Schema> extends infer Tokens extends Token[] ?
    // If the tokenizer is successful, check if the tokens are valid
    IsValidArray<Tokens, Schema> extends true ?
      // If the tokens are valid, check if the parentheses and square brackets are balanced
      CheckParentheses<Tokens> extends true ?
        CheckSquareBrackets<Tokens> extends true ?
          true
        : "Square brackets are not balanced"
      : "Parentheses are not balanced"
    : IsValidArray<Tokens, Schema>
  : Tokenizer<T, Schema>;

export type {
  CheckParentheses,
  CheckSquareBrackets,
  ReadToken,
  ReadEscapeToken,
  Tokenizer as FilterTokenizer,
  IsNextTokenValid,
  IsValidArray,
  ValidNextTokenMap,
  ValidNextOperatorMap,
  TypeToOperatorMap,
  Parse as ParseFilter,
};
