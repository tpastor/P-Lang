import { EOL } from "os";

export enum TokenType {
  // Literal Types
  Null,
  Number,
  Identifier,
  Semicolon,
  Dot,
  StringMark,

  // Keywords
  Let,
  Const,
  Fn,
  If,
  Else,
  While,
  For,
  Break,
  Continue,
  Return,

  // Grouping * Operators
  BinaryOperator,
  Equals,
  Comma,
  Colon,
  OpenParen,
  CloseParen,
  OpenBrace,
  CloseBrace,
  OpenBracket,
  CloseBracket,
  EOF, // Signified the end of file
}

/**
 * Constant lookup for keywords and known identifiers + symbols.
 */
const KEYWORDS: Record<string, TokenType> = {
  let: TokenType.Let,
  const: TokenType.Const,
  fn: TokenType.Fn,
  if: TokenType.If,
  while: TokenType.While,
  for: TokenType.For,
  break: TokenType.Break,
  continue: TokenType.Continue,
  return: TokenType.Return,
  else: TokenType.Else
};

// Represents a single token from the source-code.
export interface Token {
  value: string; // contains the raw value as seen inside the source code.
  type: TokenType; // tagged structure.
}

// Returns a token of a given type and value
function token(value = "", type: TokenType): Token {
  return { value, type };
}

function isalphanumeric(src: string) {
  return isalpha(src) || isint(src);
}

/**
 * Returns whether the character passed in alphabetic -> [a-zA-Z]
 */
function isalpha(src: string) {
  return src.toUpperCase() != src.toLowerCase();
}

/**
 * Returns true if the character is whitespace like -> [\s, \t, \n]
 */
function isskippable(str: string) {
  return str == " " || str == "\t" || str == "\n" || str == "\r";
}

/**
 Return whether the character is a valid integer -> [0-9]
*/
function isint(str: string) {
  const c = str.charCodeAt(0);
  const bounds = ["0".charCodeAt(0), "9".charCodeAt(0)];
  return c >= bounds[0] && c <= bounds[1];
}

export function tokenize(sourceCode: string): Token[] {
  const tokens = new Array<Token>();
  const src = sourceCode.split(/(?!$)/u);
  let isComment: boolean = false;

  // produce tokens until the EOF is reached.
  while (src.length > 0) {

    // begin comment
    if (src.length > 1 && src[0] == "/" && src[1] == "/") {
      src.shift()
      src.shift()
      isComment = true;
      continue;
    }

    // end comment
    if (isComment == true && (src[0] == '\n' || src[0] == '\r')) {
      isComment = false;
    }

    // under comment
    if (isComment == true) {
      src.shift()
      continue
    }

    // BEGIN PARSING ONE CHARACTER TOKENS
    if (src[0] == "(") {
      tokens.push(token(src.shift(), TokenType.OpenParen));
    } else if (src[0] == ")") {
      tokens.push(token(src.shift(), TokenType.CloseParen));
    } else if (src[0] == "{") {
      tokens.push(token(src.shift(), TokenType.OpenBrace));
    } else if (src[0] == "}") {
      tokens.push(token(src.shift(), TokenType.CloseBrace));
    } else if (src[0] == "[") {
      tokens.push(token(src.shift(), TokenType.OpenBracket));
    } else if (src[0] == "]") {
      tokens.push(token(src.shift(), TokenType.CloseBracket));
    } else if (src[0] == ".") {
      tokens.push(token(src.shift(), TokenType.Dot));
    } else if (src.length > 1 && src[0] == "+" && src[1] == "+") {
      src.shift()
      src.shift()
      tokens.push(token("++", TokenType.BinaryOperator));
    } else if (src.length > 1 && src[0] == "-" && src[1] == "-") {
      src.shift()
      src.shift()
      tokens.push(token("--", TokenType.BinaryOperator));
    }
    // HANDLE BINARY OPERATORS
    else if (
      src[0] == "+" || src[0] == "-" || src[0] == "*" || src[0] == "/" ||
      src[0] == "%" || src[0] == ">" || src[0] == "<"
    ) {
      tokens.push(token(src.shift(), TokenType.BinaryOperator));
    } else if (src.length > 1 && src[0] == "=" && src[1] == "=") {
      src.shift()
      src.shift()
      tokens.push(token("==", TokenType.BinaryOperator));
    } else if (src.length > 1 && src[0] == "!" && src[1] == "=") {
      src.shift()
      src.shift()
      tokens.push(token("!=", TokenType.BinaryOperator));
    } else if (src.length > 1 && src[0] == ">" && src[1] == "=") {
      src.shift()
      src.shift()
      tokens.push(token(">=", TokenType.BinaryOperator));
    } else if (src.length > 1 && src[0] == "<" && src[1] == "=") {
      src.shift()
      src.shift()
      tokens.push(token("<=", TokenType.BinaryOperator));
    }
    // Handle Conditional & Assignment Tokens
    else if (src[0] == "=") {
      tokens.push(token(src.shift(), TokenType.Equals));
    } else if (src[0] == ";") {
      tokens.push(token(src.shift(), TokenType.Semicolon));
    } else if (src[0] == ":") {
      tokens.push(token(src.shift(), TokenType.Colon));
    } else if (src[0] == ",") {
      tokens.push(token(src.shift(), TokenType.Comma));
    } else if (src[0] == "\"") {
      src.shift()
      let ident = "";
      while (src.length > 0 && src[0] != "\"") {
        if (src[0] == "\\") {
          src.shift()
          ident += src.shift()
        }
        ident += src.shift()
      }
      src.shift()
      tokens.push(token(ident, TokenType.StringMark));
    }
    else if (isint(src[0])) {
      let num = "";
      while (src.length > 0 && isint(src[0])) {
        num += src.shift();
      }

      // append new numeric token.
      tokens.push(token(num, TokenType.Number));
    } // Handle Identifier & Keyword Tokens.
    else if (isalpha(src[0])) {
      let ident = "";
      while (src.length > 0 && isalphanumeric(src[0])) {
        ident += src.shift();
      }

      // CHECK FOR RESERVED KEYWORDS
      const reserved = KEYWORDS[ident];
      // If value is not undefined then the identifier is
      // recognized keyword
      if (typeof reserved == "number") {
        tokens.push(token(ident, reserved));
      } else {
        // Unrecognized name must mean user defined symbol.
        tokens.push(token(ident, TokenType.Identifier));
      }
    } else if (isskippable(src[0])) {
      // Skip unneeded chars.
      src.shift();
    } // Handle unrecognized characters.
    // TODO: Implement better errors and error recovery.
    else {
      console.error(
        "Unrecognized character found in source: ",
        src[0].charCodeAt(0),
        src[0],
      );
      process.exit(1);
    }
  }

  tokens.push({ type: TokenType.EOF, value: "EndOfFile" });
  return tokens;
}