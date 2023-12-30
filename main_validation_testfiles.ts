import { Stmt } from "./comp/ast";
import Parser from "./comp/parser";
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


function getFiles(dir, files = []) {
  // Get an array of all files and directories in the passed directory using fs.readdirSync
  const fileList = fs.readdirSync(dir)
  // Create the full path of the file/directory by concatenating the passed directory and file/directory name
  for (const file of fileList) {
    const name = `${dir}/${file}`
    // Check if the current file/directory is a directory using fs.statSync
    if (fs.statSync(name).isDirectory()) {
      // If it is a directory, recursively call the getFiles function with the directory path and the files array
      getFiles(name, files)
    } else {
      // If it is a file, push the full path to the files array
      files.push(name)
    }
  }
  return files
}

function unbackslash(s) {
  return s.replace(/\\([\\rnt'"])/g, function (match, p1) {
    if (p1 === 'n') {
      return '\n';
    }
    if (p1 === 'r') {
      return '\r';
    }
    if (p1 === 't') {
      return '\t';
    }
    if (p1 === '\\') {
      return '\\';
    }
    return p1;       // unrecognised escape
  });
}
