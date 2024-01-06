import { Stmt } from "./comp/ast";
import Parser from "./comp/parser";
import { replacer, unbackslash } from "./main_helper";
import { createGlobalEnv } from "./native-api/base";
import { evaluate } from "./runtime/interpreter";
const fs = require('fs');

const parser = new Parser();

fs.readFile('./testfiles/test25.txt', 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log("SOURCE CODE");
  console.log(data);
  const env = createGlobalEnv();
  const program:Stmt = parser.produceAST(unbackslash(data));
  env.scopeOwner = program
  console.log("AST");
  console.log(JSON.stringify(program, replacer, 4));
  console.log("EVALUATE");
  const result = evaluate(program, env)
  console.log(JSON.stringify(result, replacer, 4));
});