import { Stmt } from "./comp/ast";
import Parser from "./comp/parser";
import { getFiles, unbackslash } from "./main_helper";
import { createGlobalEnv } from "./native-api/base";
import { evaluate } from "./runtime/interpreter";
const fs = require('fs');

const parser = new Parser();

for (let file of getFiles("./testfiles")) {
  console.log("Processing file " + file);
  const sourceCode = fs.readFileSync(file, 'utf8')  
  const env = createGlobalEnv();
  const program: Stmt = parser.produceAST(unbackslash(sourceCode));
  env.scopeOwner = program
  console.log("EVALUATE");
  evaluate(program, env)
  console.log("EVALUATED");
}

console.log("SUCCESS");