import Parser from "./comp/parser";
import { createGlobalEnv } from "./native-api/base";
import { evaluate } from "./runtime/interpreter";
const fs = require('fs');

repl();

function repl() {
  const parser = new Parser();
  console.log("Repl v1.0");
  const env = createGlobalEnv();

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

function prompt() {
  var fs = require("fs");

  var rtnval = "";

  var buffer = Buffer.alloc ? Buffer.alloc(1) : new Buffer(1);

  for (; ;) {
    fs.readSync(0, buffer, 0, 1);   //0 is fd for stdin
    if (buffer[0] === 10) {   //LF \n   return on line feed
      break;
    } else if (buffer[0] !== 13) {     //CR \r   skip carriage return
      rtnval += new String(buffer);
    }
  }

  return rtnval;
}