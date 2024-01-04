import { Program, Stmt } from "./ast";
import { Token, TokenType, tokenize } from "./lexer";

export default abstract class BaseParser {
    private tokens: Token[] = [];

    /*
    * Determines if the parsing is complete and the END OF FILE Is reached.
    */
    protected not_eof(): boolean {
      return this.tokens[0].type != TokenType.EOF;
    }
  
  
    protected at() {
      return this.tokens[0] as Token;
    }
  
    protected la(): Token | undefined {
      if (this.tokens.length > 1) {
        return this.tokens[1] as Token;
      } else {
        return undefined
      }
    }
  
    /**
     * Returns the previous token and then advances the tokens array to the next value.
     */
    protected eat() {
      return this.tokens.shift() as Token;
    }
  
  
    protected expect(type: TokenType, err: any): Token {
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

    protected abstract parse_stmt(program:Program): Stmt;
}