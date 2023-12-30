  import { AggregatedExpr, ArrayDeclaration, FunctionDeclaration, Program, VarDeclaration } from "../../comp/ast";
  import { createFunctionExtensions } from "../../native-api/functions";
  import Environment from "../environment";
  import { evaluate } from "../interpreter";
  import { FunctionVal, MK_ARRAY, MK_NULL, NumberVal, RuntimeVal } from "../values";

  export function eval_program(program: Program, env: Environment): RuntimeVal {
    let lastEvaluated: RuntimeVal = MK_NULL();
    for (const statement of program.body) {
      lastEvaluated = evaluate(statement, env);
      if (env.returnVal) {
        process.exit(env.returnVal ? (env.returnVal as NumberVal).value : 0);
      } 
    }
    return lastEvaluated;
  }

  export function eval_aggr_expr(program: AggregatedExpr, env: Environment): RuntimeVal {
    let lastEvaluated: RuntimeVal = MK_NULL();
    for (const statement of program.stmts) {
      lastEvaluated = evaluate(statement, env);      
    }
    return lastEvaluated;
  }

  export function eval_array_declaration(
    declaration: ArrayDeclaration,
    env: Environment,
  ): RuntimeVal {
    return MK_ARRAY([]);
  }

  export function eval_var_declaration(
    declaration: VarDeclaration,
    env: Environment,
  ): RuntimeVal {
    let value = declaration.value
      ? evaluate(declaration.value, env)
      : MK_NULL();

      if (declaration.isArray) {
        value = MK_ARRAY([]);
      }

    return env.declareVar(declaration.identifier, value, declaration.constant);
  }


  export function eval_function_declaration(
    declaration: FunctionDeclaration,
    env: Environment
  ): RuntimeVal {
    // Create new function scope
    const fn = {
      type: "function",
      name: declaration.name,
      parameters: declaration.parameters,
      declarationEnv: env,
      body: declaration.body,      
    } as FunctionVal;

    fn.properties = createFunctionExtensions(fn, env)
  
    return env.declareVar(declaration.name, fn, true);
  }