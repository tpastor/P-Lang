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
  Native,
  NativeBlock,
  Export,
  Import,

  If,
  Else,
  While,
  For,
  Foreach,
  Break,
  Continue,
  Return,
  Negation,

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
  else: TokenType.Else,
  native: TokenType.Native,
  foreach: TokenType.Foreach,
  export: TokenType.Export,
  import: TokenType.Import,
};

// Represents a single token from the source-code.
export interface Token {
  value: string;
  type: TokenType;
  lineNumber: number;
  fileName: string
}

// Returns a token of a given type and value
function token(value = "", type: TokenType, lineNumber: number, fileName: string): Token {
  return { value, type, lineNumber: lineNumber, fileName };
}

function isalphanumeric(str) {
  var code, i, len;

  for (i = 0, len = str.length; i < len; i++) {
    code = str.charCodeAt(i);
    if (!(code > 47 && code < 58) && // numeric (0-9)
      !(code > 64 && code < 91) && // upper alpha (A-Z)
      !(code == "_".charCodeAt(0)) && // _
      !(code > 96 && code < 123)) { // lower alpha (a-z)
      return false;
    }
  }
  return true;
};


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

function isnumber(str: string) {
  const c = str.charCodeAt(0);
  const bounds = ["0".charCodeAt(0), "9".charCodeAt(0)];
  return c == ".".charCodeAt(0) || (c >= bounds[0] && c <= bounds[1]);
}

export function tokenize(sourceCode: string): Token[] {
  const tokens = new Array<Token>();
  const src = sourceCode.split(/(?!$)/u);
  let isComment: boolean = false;
  let lineNumber: number = 1
  let fileName: string = "single-file"

  // produce tokens until the EOF is reached.
  while (src.length > 0) {

    /// get fileName
    if (src.length > 8 && startsWith(src, "###file:")) {
      for (let s of "###file:") {
        src.shift()
      }
      let ident = ""
      while (src.length > 0 && src[0] != "#") {
        ident += src.shift()
      }
      src.shift()
      if (src[0] == '\n') {
        src.shift()
      }
      fileName = ident
    }

    if (src[0] == '\n') {
      lineNumber++;
    }

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
      tokens.push(token(src.shift(), TokenType.OpenParen, lineNumber, fileName));
    } else if (src[0] == ")") {
      tokens.push(token(src.shift(), TokenType.CloseParen, lineNumber, fileName));
    } else if (src[0] == "{") {
      tokens.push(token(src.shift(), TokenType.OpenBrace, lineNumber, fileName));
    } else if (src[0] == "}") {
      tokens.push(token(src.shift(), TokenType.CloseBrace, lineNumber, fileName));
    } else if (src[0] == "[") {
      tokens.push(token(src.shift(), TokenType.OpenBracket, lineNumber, fileName));
    } else if (src[0] == "]") {
      tokens.push(token(src.shift(), TokenType.CloseBracket, lineNumber, fileName));
    } else if (src[0] == ".") {
      tokens.push(token(src.shift(), TokenType.Dot, lineNumber, fileName));
    } else if (src.length > 1 && src[0] == "+" && src[1] == "+") {
      src.shift()
      src.shift()
      tokens.push(token("++", TokenType.BinaryOperator, lineNumber, fileName));
    } else if (src.length > 1 && src[0] == "-" && src[1] == "-") {
      src.shift()
      src.shift()
      tokens.push(token("--", TokenType.BinaryOperator, lineNumber, fileName));
    } else if (src.length > 1 && src[0] == "%" && src[1] == "%") {
      src.shift()
      src.shift()
      let ident = "";
      while (src.length > 1 && !(src[0] == "%" && src[1] == "%")) {
        ident += src.shift()
      }
      src.shift()
      src.shift()
      tokens.push(token(ident, TokenType.NativeBlock, lineNumber, fileName));
    }
    // HANDLE BINARY OPERATORS
    else if (
      src[0] == "+" || src[0] == "-" || src[0] == "*" || src[0] == "/" ||
      src[0] == "%" || src[0] == ">" || src[0] == "<"
    ) {
      tokens.push(token(src.shift(), TokenType.BinaryOperator, lineNumber, fileName));
    } else if (src.length > 1 && src[0] == "=" && src[1] == "=") {
      src.shift()
      src.shift()
      tokens.push(token("==", TokenType.BinaryOperator, lineNumber, fileName));
    } else if (src.length > 1 && src[0] == "!" && src[1] == "=") {
      src.shift()
      src.shift()
      tokens.push(token("!=", TokenType.BinaryOperator, lineNumber, fileName));
    } else if (src.length > 1 && src[0] == ">" && src[1] == "=") {
      src.shift()
      src.shift()
      tokens.push(token(">=", TokenType.BinaryOperator, lineNumber, fileName));
    } else if (src.length > 1 && src[0] == "<" && src[1] == "=") {
      src.shift()
      src.shift()
      tokens.push(token("<=", TokenType.BinaryOperator, lineNumber, fileName));
    }
    // Handle Conditional & Assignment Tokens
    else if (src[0] == "=") {
      tokens.push(token(src.shift(), TokenType.Equals, lineNumber, fileName));
    } else if (src[0] == ";") {
      tokens.push(token(src.shift(), TokenType.Semicolon, lineNumber, fileName));
    } else if (src[0] == ":") {
      tokens.push(token(src.shift(), TokenType.Colon, lineNumber, fileName));
    } else if (src[0] == ",") {
      tokens.push(token(src.shift(), TokenType.Comma, lineNumber, fileName));
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
      tokens.push(token(ident, TokenType.StringMark, lineNumber, fileName));
    }
    else if (src[0] == "!") {
      src.shift()
      tokens.push(token("!", TokenType.Negation, lineNumber, fileName));
    }
    else if (isint(src[0])) {
      let num = "";
      while (src.length > 0 && isnumber(src[0])) {
        num += src.shift();
      }

      // append new numeric token.
      tokens.push(token(num, TokenType.Number, lineNumber, fileName));
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
        tokens.push(token(ident, reserved, lineNumber, fileName));
      } else {
        // Unrecognized name must mean user defined symbol.
        tokens.push(token(ident, TokenType.Identifier, lineNumber, fileName));
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
        fileName,
        lineNumber      
      );
      process.exit(1);
    }
  }

  tokens.push({ type: TokenType.EOF, value: "EndOfFile", lineNumber: -1, fileName: "EOF" });
  return tokens;
}

function startsWith(seq: string[], startsWith: string) {
  if (seq.length > startsWith.length) {
    for (let i = 0; i < startsWith.length; i++) {
      if (seq[i] != startsWith[i]) {
        return false;
      }
    }
    return true;
  } else {
    return false
  }
}
