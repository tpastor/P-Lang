  import { AggregatedExpr, ArrayDeclaration, FunctionDeclaration, Program, VarDeclaration } from "../../comp/ast";
  import { createFunctionExtensions } from "../../native-api/functions";
  import { evaluate } from "../interpreter";
  import { FunctionReturn, FunctionVal, MK_ARRAY, MK_NULL, NumberVal, RuntimeVal } from "../values";
  import Environment from "../environment";

  export function eval_program(program: Program, env: Environment): RuntimeVal {
    let lastEvaluated: RuntimeVal = MK_NULL();
    for (const statement of program.body) {
      lastEvaluated = evaluate(statement, env);
      if (lastEvaluated.type == "functionReturn") {
        const val = (lastEvaluated as FunctionReturn).values[0]
        if (val.type == "number") {
          process.exit((val as NumberVal).value)
        } else {
          process.exit(0)
        }
        
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
    if (declaration.items) {
      return MK_ARRAY(declaration.items.map(item => evaluate(item, env)))
    }
    return MK_ARRAY([]);
  }

  export function eval_var_declaration(
    declaration: VarDeclaration,
    env: Environment,
  ): RuntimeVal {
    if (declaration.value) {
      const val = evaluate(declaration.value[0], env)      
      if (val.type == "functionReturn") {
        const rets = val as FunctionReturn;        
        for(let i = 0; i < declaration.identifier.length; i++) {
          const id = declaration.identifier[i]        
          env.declareVar(id, rets.values[i] || val, declaration.constant)
        }
        return rets.values[declaration.identifier.length - 1]
      } else {
        return env.declareVar(declaration.identifier[0], val, declaration.constant)
      }
      
    } else {
      let value = declaration.isArray ? MK_ARRAY([]) : MK_NULL();    
      return env.declareVar(declaration.identifier[0], value, declaration.constant);
    }
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