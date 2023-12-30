import Parser from "./comp/parser";
import { createGlobalEnv } from "./native-api/base";
import { evaluate } from "./runtime/interpreter";
const fs = require('fs');

const parser = new Parser();

fs.readFile('./testfiles/test10.txt', 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log("SOURCE CODE");
  console.log(data);
  const env = createGlobalEnv();
  const program = parser.produceAST(unbackslash(data));
  console.log("AST");
  console.log(JSON.stringify(program, replacer, 4));
  console.log("EVALUATE");
  const result = evaluate(program, env)
  console.log(JSON.stringify(result, replacer, 4));
});


function replacer(key, value) {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries()), // or with spread: value: [...value]
    };
  } else {
    return value;
  }
}

function unbackslash(s) {
  return s.replace(/\\([\\rnt'"])/g, function(match, p1) {
      if (p1 === 'n') return '\n';
      if (p1 === 'r') return '\r';
      if (p1 === 't') return '\t';
      if (p1 === '\\') return '\\';
      return p1;       // unrecognised escape
  });
}
