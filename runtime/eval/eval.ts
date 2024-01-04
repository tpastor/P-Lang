import { Import, Stmt } from "../../comp/ast";
import Parser from "../../comp/parser";
import { unbackslash } from "../../main_helper";
import { createGlobalEnv } from "../../native-api/base";
import Environment from "../environment";
import { evaluate } from "../interpreter";
import { RuntimeVal, MK_OBJECT, MK_NULL } from "../values";

export function eval_import(importExpr: Import, env: Environment): RuntimeVal {
    const fs = require('fs');
    const parser = new Parser();
    let source;
    try {
    source = fs.readFileSync(importExpr.fileName, 'utf8')
    } catch(ex) {
        throw new Error("Could not load file " + importExpr, { cause: ex });
    }
    const newEnv = createGlobalEnv();
    const fileName = "###file:" + importExpr.fileName + "#"
    const program: Stmt = parser.produceAST(unbackslash(fileName + source));
    env.scopeOwner = program
    evaluate(program, newEnv)
    const vars: string[] = newEnv.getExports()
    if (importExpr.namespace) {
        const map: Map<string, RuntimeVal> = new Map()
        vars.forEach(item => map.set(item, newEnv.lookupVar(item)))
        return env.declareVar(importExpr.namespace, MK_OBJECT(map), true, false)
    } else {
        vars.forEach(element => {
            env.declareVar(element, newEnv.lookupVar(element), true, false)
        });
    }
    return MK_NULL();
}