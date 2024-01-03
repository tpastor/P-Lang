import Parser from "./comp/parser";
import { createGlobalEnv } from "./native-api/base";
import { evaluate } from "./runtime/interpreter";
const fs = require('fs');

repl();

function repl() {
  const parser = new Parser();
  console.log("Repl v1.0");
  const env = createGlobalEnv();

// sourcery skip: avoid-infinite-loops
  while (true) {
    const input = prompt();
    if (!input || input.includes("exit")) {
      process.exit(1);
    }
    const program = parser.produceAST(input);
    console.log("AST");
    console.log(JSON.stringify(program, null, 4));
    const result = evaluate(program, env)
    console.log("EVALUATE");
    console.log(JSON.stringify(result, null, 4))
  }
}