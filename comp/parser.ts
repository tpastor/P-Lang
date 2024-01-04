import {
  AggregatedExpr,
  ArrayDeclaration,
  AssignmentExpr,
  BinaryExpr,
  CallExpr,
  ContinueBreak,
  Expr,
  ForeachExpr,
  ForExpr,
  FunctionDeclaration,
  Identifier,
  IfExpr,
  Import,
  MemberExpr,
  NativeBlock,
  NumericLiteral,
  ObjectLiteral,
  Program,
  Property,
  Return,
  Stmt,
  StringLiteral,
  UnaryExpr,
  VarDeclaration,
  WhileExpr,
} from "./ast";

import { Token, tokenize, TokenType } from "./lexer";

/**
 * Frontend for producing a valid AST from source code
 */
export default class Parser {
  private tokens: Token[] = [];

  /*
  * Determines if the parsing is complete and the END OF FILE Is reached.
  */
  private not_eof(): boolean {
    return this.tokens[0].type != TokenType.EOF;
  }


  private at() {
    return this.tokens[0] as Token;
  }

  private la(): Token | undefined {
    if (this.tokens.length > 1) {
      return this.tokens[1] as Token;
    } else {
      return undefined
    }
  }

  /**
   * Returns the previous token and then advances the tokens array to the next value.
   */
  private eat() {
    return this.tokens.shift() as Token;
  }


  private expect(type: TokenType, err: any): Token {
    const prev = this.tokens.shift() as Token;
    if (!prev || prev.type != type) {
      console.error("Parser Error:\n", err, prev, " - Expecting: ", type);
      process.exit(1);
    }

    return prev;
  }

  public produceAST(sourceCode: string): Program {
    this.tokens = tokenize(sourceCode);
    const program: Program = {
      kind: "Program",
      body: [],
    };

    // Parse until end of file
    while (this.not_eof()) {
      program.body.push(this.parse_stmt(program));
    }

    return program;
  }

  private parse_stmt(program: Program): Stmt {

    switch (this.at().type) {
      case TokenType.For:
        return this.parse_for_declaration(program);
      case TokenType.Foreach:
        return this.parse_foreach_declaration(program);
      case TokenType.While:
        return this.parse_while_declaration(program);
      case TokenType.If:
        return this.parse_if_declaration(program);
      case TokenType.Fn:
        return this.parse_fn_declaration(program);
      case TokenType.Export:
      case TokenType.Let:
      case TokenType.Const:
        return this.parse_var_declaration(program);
      case TokenType.Break:
      case TokenType.Continue:
        return this.parse_break_continue(program)
      case TokenType.Return:
        return this.parse_return(program)
      case TokenType.Import:
        return this.parse_import(program)
      default:
        return this.parse_expr(program);
    }
  }

  private parse_negation(program: Program): Stmt {
    const token = this.eat();
    const op = this.parse_expr(program)
    return {
      kind: "UnaryExpr",
      left: op,
      operator: "!",
      tokenForDebug: token,
    } as UnaryExpr;
  }

  private parse_return(program: Program): Stmt {
    const token = this.eat();
    let ret = [];
    if (this.at().type != TokenType.CloseBrace) {
      this.parse_arguments_list(program).forEach(arg => ret.push(arg))
    }
    if (this.at().type == TokenType.Semicolon) {
      this.eat();
    }
    return { kind: "Return", returnVal: ret, tokenForDebug: token } as Return;
  }

  private parse_break_continue(program: Program): Stmt {
    const token = this.eat();
    if (this.at().type == TokenType.Semicolon) {
      this.eat();
    }
    return { kind: "ContinueBreak", isContinue: !!(token.value == "continue"), tokenForDebug: token } as ContinueBreak;
  }

  private parse_for_declaration(program: Program): Stmt {
    const token = this.eat();
    this.expect(
      TokenType.OpenParen,
      "for expects open parenthesis"
    );

    const variable = this.parse_stmt(program);

    if (this.at().type == TokenType.Semicolon) {
      this.eat();
    }

    const condition = this.parse_expr(program);

    this.expect(
      TokenType.Semicolon,
      "for expects colon"
    );

    const increment = this.parse_expr(program);

    this.expect(
      TokenType.CloseParen,
      "for expects close paren"
    );

    this.expect(
      TokenType.OpenBrace,
      "for expects open bracket"
    );

    const body: Stmt[] = [];

    while (
      this.at().type !== TokenType.EOF &&
      this.at().type !== TokenType.CloseBrace
    ) {
      body.push(this.parse_stmt(program));
    }

    this.expect(
      TokenType.CloseBrace,
      "for expects close bracket"
    );

    return {
      condition: condition,
      increment: increment,
      var: variable,
      body: body,
      kind: "ForExpr",
      tokenForDebug: token
    } as ForExpr;

  }

  private parse_foreach_declaration(program: Program): Stmt {
    const token = this.eat();
    this.expect(
      TokenType.OpenParen,
      "for expects open parenthesis"
    );

    const variable = this.parse_stmt(program);

    const forin = this.expect(
      TokenType.Identifier,
      "foreach expects in"
    );

    if (forin.value != "in") {
      throw "foreach missing in"
    }

    const iterable: Identifier = {
      kind: "Identifier", symbol: this.expect(
        TokenType.Identifier,
        "foreach expects iterable"
      ).value
    } as Identifier;

    this.expect(
      TokenType.CloseParen,
      "foreach expects close paren"
    );

    this.expect(
      TokenType.OpenBrace,
      "foreach expects open bracket"
    );

    const body: Stmt[] = [];

    while (
      this.at().type !== TokenType.EOF &&
      this.at().type !== TokenType.CloseBrace
    ) {
      body.push(this.parse_stmt(program));
    }

    this.expect(
      TokenType.CloseBrace,
      "foreach expects close bracket"
    );

    return {
      iterable: iterable,
      var: variable,
      body: body,
      kind: "ForeachExpr",
      tokenForDebug: token
    } as ForeachExpr;

  }

  private parse_if_declaration(program: Program): Stmt {
    const token = this.eat();
    this.expect(
      TokenType.OpenParen,
      "if expects open parenthesis"
    );

    const condition = this.parse_expr(program);

    this.expect(
      TokenType.CloseParen,
      "if expects close parenthesis"
    );

    this.expect(
      TokenType.OpenBrace,
      "if expects open bracket"
    );

    const body: Stmt[] = [];

    while (
      this.at().type !== TokenType.EOF &&
      this.at().type !== TokenType.CloseBrace
    ) {
      body.push(this.parse_stmt(program));
    }

    this.expect(
      TokenType.CloseBrace,
      "if expects close bracket"
    );

    const elseBody: Stmt[] = [];

    if (this.at().type == TokenType.Else) {
      this.eat()
      this.expect(
        TokenType.OpenBrace,
        "if expects open bracket"
      );

      while (
        this.at().type !== TokenType.EOF &&
        this.at().type !== TokenType.CloseBrace
      ) {
        elseBody.push(this.parse_stmt(program));
      }

      this.expect(
        TokenType.CloseBrace,
        "if expects close bracket"
      );

    }

    return {
      condition: condition,
      body: body,
      elseBody: elseBody,
      kind: "IfExpr",
      tokenForDebug: token
    } as IfExpr;
  }

  parse_while_declaration(program: Program): Stmt {
    const token = this.eat();
    this.expect(
      TokenType.OpenParen,
      "while expects open parenthesis"
    );

    const condition = this.parse_expr(program);

    this.expect(
      TokenType.CloseParen,
      "while expects close parenthesis"
    );

    this.expect(
      TokenType.OpenBrace,
      "while expects open bracket"
    );

    const body: Stmt[] = [];

    while (
      this.at().type !== TokenType.EOF &&
      this.at().type !== TokenType.CloseBrace
    ) {
      body.push(this.parse_stmt(program));
    }

    this.expect(
      TokenType.CloseBrace,
      "while expects close bracket"
    );

    return {
      condition: condition,
      body: body,
      kind: "WhileExpr",
      tokenForDebug: token
    } as WhileExpr;
  }

  parse_fn_declaration(program: Program): FunctionDeclaration {
    const token = this.eat();

    let isNative = false;
    if (this.at().type == TokenType.Native) {
      this.eat()
      isNative = true;
    }

    let name = undefined
    if (this.at().type == TokenType.Identifier) {
      name = this.expect(
        TokenType.Identifier,
        "Expected function name following fn keyword"
      ).value;
    }

    const args = this.parse_args(program);
    const params: string[] = [];
    for (const arg of args) {
      if (arg.kind !== "Identifier") {
        throw "Inside function declaration expected parameters to be of type string.";
      }

      params.push((arg as Identifier).symbol);
    }

    this.expect(
      TokenType.OpenBrace,
      "Expected function body following declaration"
    );
    const body: Stmt[] = [];

    if (isNative) {
      let ident = ""
      if (this.at().type == TokenType.NativeBlock) {
        ident = this.eat().value
      }
      body.push({ kind: "NativeBlock", parameters: args, sourceCode: ident } as NativeBlock)
    } else {
      while (
        this.at().type !== TokenType.EOF &&
        this.at().type !== TokenType.CloseBrace
      ) {
        body.push(this.parse_stmt(program));
      }
    }

    this.expect(
      TokenType.CloseBrace,
      "Closing brace expected inside function declaration"
    );

    return {
      body,
      name: name || this.generateFunctionName(20),
      parameters: params,
      kind: "FunctionDeclaration",
      tokenForDebug: token
    } as FunctionDeclaration;
  }

  private generateFunctionName(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length - 2) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return "__" + result;
  }

  private parse_expr(program: Program): Expr {
    return this.parse_assignment_expr(program);
  }

  private parse_assignment_expr(program: Program): Expr {
    const left = this.parse_object_expr(program);

    if (this.at().type == TokenType.Equals) {
      const token = this.eat(); // advance past equals
      const value = this.parse_assignment_expr(program);
      return { value, assigne: left, kind: "AssignmentExpr", tokenForDebug: token } as AssignmentExpr;
    }

    return left;
  }

  private parse_object_expr(program: Program): Expr {
    // { Prop[] }
    if (this.at().type !== TokenType.OpenBrace) {
      return this.parse_comparison_expr(program);
    }

    const token = this.eat(); // advance past open brace.

    const properties = new Array<Property>();

    while (this.not_eof() && this.at().type != TokenType.CloseBrace) {

      const key = this.at().type == TokenType.Identifier ?
        this.expect(TokenType.Identifier, "Object literal key expected").value
        : this.expect(TokenType.StringMark, "Object literal key expected").value

      // Allows shorthand key: pair -> { key, }
      if (this.at().type == TokenType.Comma) {
        this.eat(); // advance past comma
        properties.push({ key, kind: "Property", tokenForDebug: token } as Property);
        continue;
      } // Allows shorthand key: pair -> { key }
      else if (this.at().type == TokenType.CloseBrace) {
        properties.push({ key, kind: "Property", tokenForDebug: token });
        continue;
      }

      // { key: val }
      this.expect(
        TokenType.Colon,
        "Missing colon following identifier in ObjectExpr",
      );
      const value = this.parse_expr(program);

      properties.push({ kind: "Property", value, key });
      if (this.at().type != TokenType.CloseBrace) {
        this.expect(
          TokenType.Comma,
          "Expected comma or closing bracket following property",
        );
      }
    }

    this.expect(TokenType.CloseBrace, "Object literal missing closing brace.");
    return { kind: "ObjectLiteral", properties, tokenForDebug: token } as ObjectLiteral;
  }


  // LET IDENT(;)
  // ( LET | CONST ) IDENT = EXPR(;)
  // ( LET | CONST ) IDENT = EXPR[](;)
  // ( LET | CONST ) IDENT = EXPR[X,P,T,O](;)
  // ( LET | CONST ) IDENT = FUNC ....(;)
  // ( LET | CONST ) IDENT1, IDENT2 = FUNC ....(;)
  parse_var_declaration(program: Program): Stmt {
    const token = this.at()
    const isExport: boolean = token.type == TokenType.Export ? this.eat() && true : false
    const isConstant = this.eat().type == TokenType.Const;
    const identifiers = this.parse_identifier_list(program)
    const identifier = identifiers[0]

    if (this.at().type != TokenType.Equals || this.at().type == TokenType.Semicolon) {
      if (this.at().type == TokenType.Semicolon) {
        this.eat(); // expect semicolon
      }
      if (isConstant) {
        throw "Must assign value to constant expression. No value provided.";
      }

      return {
        kind: "VarDeclaration",
        identifier: [identifier],
        constant: false,
        isArray: false,
        tokenForDebug: token,
        isExport: isExport,
      } as VarDeclaration;
    }

    this.expect(
      TokenType.Equals,
      "Expected equals token following identifier in var declaration.",
    );

    const arrayBody = this.parse_array_value_declaration(isConstant, identifier, program)
    if (arrayBody) {
      return arrayBody
    }

    if (this.at().type == TokenType.Fn) {
      let token = this.at()
      const func: FunctionDeclaration = this.parse_fn_declaration(program)
      const stmts: Stmt[] = [func]

      stmts.unshift({
        kind: "VarDeclaration",
        identifier: [identifier],
        constant: isConstant,
        isArray: false,
        tokenForDebug: token,
        isExport: isExport,
      } as VarDeclaration)

      stmts.push(
        {
          value: {
            kind: "Identifier",
            symbol: func.name,
          }, assigne: {
            kind: "Identifier",
            symbol: identifier,
          }, kind: "AssignmentExpr",
          tokenForDebug: token
        } as AssignmentExpr);

      if (this.at().type == TokenType.Semicolon) {
        this.eat();
      }

      return {
        kind: "AggregatedExpr",
        stmts: stmts,
        tokenForDebug: token,
      } as AggregatedExpr

    }

    //
    const declaration = {
      kind: "VarDeclaration",
      value: [this.parse_expr(program)],
      identifier: identifiers,
      constant: isConstant,
      isArray: false,
      tokenForDebug: token,
      isExport: isExport,
    } as VarDeclaration;

    if (this.at().type == TokenType.Semicolon) {
      this.eat();
    }

    return declaration;
  }

  private parse_comparison_expr(program: Program): Expr {
    const token = this.at()
    let left = this.parse_additive_expr(program);

    if (this.at().value == "++" || this.at().value == "--") {
      const operator = this.eat().value;
      return {
        kind: "UnaryExpr",
        left,
        operator,
        tokenForDebug: token
      } as UnaryExpr;
    }

    while (this.at().value == "==" || this.at().value == ">=" || this.at().value == "<=" || this.at().value == "!="
      || this.at().value == ">" || this.at().value == "<") {
      const operator = this.eat().value;
      const right = this.parse_additive_expr(program);
      left = {
        kind: "BinaryExpr",
        left,
        right,
        operator,
        tokenForDebug: token
      } as BinaryExpr;
    }

    return left;
  }

  // Handle Addition & Subtraction Operations
  private parse_additive_expr(program: Program): Expr {
    const token = this.at()
    let left = this.parse_multiplicative_expr(program);

    while (this.at().value == "+" || this.at().value == "-") {
      const operator = this.eat().value;
      const right = this.parse_multiplicative_expr(program);
      left = {
        kind: "BinaryExpr",
        left,
        right,
        operator,
        tokenForDebug: token
      } as BinaryExpr;
    }

    return left;
  }

  // Handle Multiplication, Division & Modulo Operations
  private parse_multiplicative_expr(program: Program): Expr {
    const token = this.at()
    let left = this.parse_member_expr(program);

    while (
      this.at().value == "/" || this.at().value == "*" || this.at().value == "%"
    ) {
      const operator = this.eat().value;
      const right = this.parse_member_expr(program);
      left = {
        kind: "BinaryExpr",
        left,
        right,
        operator,
        tokenForDebug: token
      } as BinaryExpr;
    }

    return left;
  }

  private parse_call_member_expr(program: Program): Expr {
    const member = this.parse_primary_expr(program);

    if (this.at().type == TokenType.OpenParen) {
      return this.parse_call_expr(member, program);
    }

    return member;
  }

  private parse_call_expr(caller: Expr, program: Program): Expr {
    const token = this.at()
    let call_expr: Expr = {
      kind: "CallExpr",
      callName: caller,
      args: this.parse_args(program),
      tokenForDebug: token
    } as CallExpr;

    if (this.at().type == TokenType.OpenParen) {
      call_expr = this.parse_call_expr(call_expr, program);
    }

    return call_expr;
  }

  private parse_args(program: Program): Expr[] {
    this.expect(TokenType.OpenParen, "Expected open parenthesis");
    const args = this.at().type == TokenType.CloseParen
      ? []
      : this.parse_arguments_list(program);

    this.expect(
      TokenType.CloseParen,
      "Missing closing parenthesis inside arguments list",
    );
    return args;
  }

  private parse_arguments_list(program: Program): Expr[] {
    const args = [this.parse_assignment_expr(program)];

    while (this.at().type == TokenType.Comma && this.eat()) {
      args.push(this.parse_assignment_expr(program));
    }

    return args;
  }

  private parse_identifier_list(program: Program): string[] {
    const args = [this.expect(TokenType.Identifier, "Variable names can only be identifier").value];

    while (this.at().type == TokenType.Comma && this.eat()) {
      args.push(this.expect(TokenType.Identifier, "Variable names can only be identifier").value);
    }

    return args;
  }

  private parse_member_expr(program: Program): Expr {
    let object = this.parse_call_member_expr(program);

    while (
      this.at().type == TokenType.Dot || this.at().type == TokenType.OpenBracket
    ) {
      const operator = this.eat();
      let property: Expr;
      let computed: boolean;

      // non-computed values aka obj.expr
      if (operator.type == TokenType.Dot) {
        computed = false;
        // get identifier
        property = this.parse_member_expr(program);
        if (property.kind != "Identifier" && property.kind != "CallExpr" && property.kind != "MemberExpr") {
          throw `Cannot use dot operator without right hand side being a identifier/CallExpr/MemberExpr`;
        }
      } else {
        computed = true;
        property = this.parse_expr(program);
        this.expect(
          TokenType.CloseBracket,
          "Missing closing bracket in computed value.",
        );
      }

      object = {
        kind: "MemberExpr",
        object,
        property,
        computed,
        tokenForDebug: operator
      } as MemberExpr;
    }

    return object;
  }

  // Parse Literal Values & Grouping Expressions
  private parse_primary_expr(program: Program): Expr {
    const token = this.at()
    const tk = this.at().type;

    // Determine which token we are currently at and return literal value
    switch (tk) {
      // User defined values.
      case TokenType.Identifier:
        return { kind: "Identifier", symbol: this.eat().value } as Identifier;

      // Constants and Numeric Constants
      case TokenType.Number:
        return {
          kind: "NumericLiteral",
          value: parseFloat(this.eat().value),
          tokenForDebug: token
        } as NumericLiteral;

      case TokenType.StringMark: {
        return {
          kind: "StringLiteral",
          value: this.eat().value,
          tokenForDebug: token
        } as StringLiteral;
      }

      case TokenType.Negation: {
        return this.parse_negation(program)
      }

      // Grouping Expressions
      case TokenType.OpenParen: {
        this.eat(); // eat the opening paren
        const value = this.parse_expr(program);
        this.expect(
          TokenType.CloseParen,
          "Unexpected token found inside parenthesized expression. Expected closing parenthesis.",
        ); // closing paren
        return value;
      }

      case TokenType.Fn: {
        return this.parse_fn_declaration(program)
      }

      case TokenType.OpenBracket: {
        const arrayDeclaration = this.parse_array_value_inline(program)
        if (arrayDeclaration) {
          return arrayDeclaration;
        }
      }

      // to handle negative numbers .........
      case TokenType.BinaryOperator:
        const val = this.eat().value
        if (val == "-" && this.at().type == TokenType.Number) {
          return { kind: "NumericLiteral", value: parseFloat(val + this.eat().value), tokenForDebug: token } as NumericLiteral;
        }
      // Unidentified Tokens and Invalid Code Reached
      default:
        console.error("Unexpected token found during parsing!", this.at());
        process.exit(1);
    }
  }

  private parse_array_value_declaration(isConstant: boolean, identifier: string, program: Program): Expr {
    if (this.at().type == TokenType.OpenBracket && this.la()?.type == TokenType.CloseBracket) {
      const token = this.at()
      this.eat()
      this.eat()

      if (this.at().type == TokenType.Semicolon) {
        this.eat();
      }

      return {
        kind: "VarDeclaration",
        identifier: [identifier],
        constant: isConstant,
        isArray: true,
        tokenForDebug: token
      } as VarDeclaration;
    }

    if (this.at().type == TokenType.OpenBracket) {
      this.eat()

      const args = this.parse_arguments_list(program)

      this.expect(
        TokenType.CloseBracket,
        "Expected close bracket token following array identifier in var declaration.",
      );

      const token = this.at()
      const stmts: Stmt[] = args.map(param => {
        return {
          kind: "CallExpr",
          callName: {
            kind: "MemberExpr",
            object: {
              kind: "Identifier",
              symbol: identifier,
            },
            property: {
              kind: "Identifier",
              symbol: "push",
            },
            computed: false,
          },
          args: [param],
          tokenForDebug: token
        } as CallExpr
      })

      stmts.unshift({
        kind: "VarDeclaration",
        identifier: [identifier],
        constant: isConstant,
        isArray: true,
        tokenForDebug: token
      } as VarDeclaration)

      if (this.at().type == TokenType.Semicolon) {
        this.eat();
      }

      return {
        kind: "AggregatedExpr",
        stmts: stmts,
        tokenForDebug: token
      } as AggregatedExpr
    }
    return undefined
  }

  private parse_array_value_inline(program: Program): Expr {
    if (this.at().type == TokenType.OpenBracket && this.la()?.type == TokenType.CloseBracket) {
      const token = this.at()
      this.eat()
      this.eat()

      if (this.at().type == TokenType.Semicolon) {
        this.eat();
      }

      return {
        kind: "ArrayDeclaration",
        tokenForDebug: token
      } as ArrayDeclaration;
    }

    if (this.at().type == TokenType.OpenBracket) {
      const token = this.at()
      this.eat()

      const args = this.parse_arguments_list(program)

      this.expect(
        TokenType.CloseBracket,
        "Expected close bracket token following array identifier in var declaration.",
      );

      if (this.at().type == TokenType.Semicolon) {
        this.eat();
      }

      return {
        kind: "ArrayDeclaration",
        items: args,
        tokenForDebug: token
      } as ArrayDeclaration;
    }
    return undefined
  }

  private parse_import(program: Program): Stmt {
    this.eat()
    const args: Expr[] = this.parse_args(program)
    if (args.length == 0 || args.length > 2) {
      throw "import expects one or 2 parameters, got " + args.length
    }

    if ((args.length == 1 && args[0].kind != "StringLiteral") || args.length == 2 && args[1].kind != "StringLiteral") {
      throw "import args must be identifiers " + JSON.stringify(args)
    }

    if (this.at().type == TokenType.Semicolon) {
      this.eat()
    }

    const namespace = args.length == 2 ? (args[0] as StringLiteral).value : null
    const fileName = args.length == 2 ? (args[1] as StringLiteral).value : (args[0] as StringLiteral).value

    return { kind: "Import", fileName: fileName, namespace: namespace } as Import;
  }
}

// Assignment
// Object
// AdditiveExpr
// MultiplicativeExpr
// Call
// Member
// PrimaryExpr
// Orders Of Precedence