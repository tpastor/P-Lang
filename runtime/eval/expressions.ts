import exp = require("constants");
import { AssignmentExpr, BinaryExpr, CallExpr, ContinueBreak, ForExpr, Identifier, IfExpr, MemberExpr, NumericLiteral, ObjectLiteral, Return, Stmt, StringLiteral, UnaryExpr, WhileExpr } from "../../comp/ast";
import Environment from "../environment";
import { evaluate } from "../interpreter";
import { ArrayVal, BooleanVal, DelegatedCall, FunctionReturn, FunctionVal, MK_BOOL, MK_FUNCTION_RETURN, MK_NULL, MK_STRING, NativeFnVal, NumberVal, ObjectVal, RuntimeVal, StringVal, isRuntimeArray, isRuntimeString } from "../values";

function eval_numeric_binary_expr(
    lhs: NumberVal,
    rhs: NumberVal,
    operator: string,
): NumberVal {
    let result: number;
    if (operator == "%") {
        result = lhs.value % rhs.value;
    } else if (operator == "+") {
        result = lhs.value + rhs.value;
    } else if (operator == "-") {
        result = lhs.value - rhs.value;
    } else if (operator == "*") {
        result = lhs.value * rhs.value;
    } else if (operator == "/") {
        // TODO: Division by zero checks
        result = lhs.value / rhs.value;
    } else {
        throw "Unknown operator " + operator + " on " + lhs + " " + rhs
    }

    return { value: result, type: "number" };
}

function compare(v1, v2, op) {
    switch (op) {
        case "==":
            return v1 == v2;
        case "!=":
            return v1 != v2;
        case ">=":
            return v1 >= v2;
        case "<=":
            return v1 <= v2;
        case ">":
            return v1 > v2;
        case "<":
            return v1 < v2;
        default:
            return false
    }
}

function eval_comparison_binary_expr(
    lhs: RuntimeVal,
    rhs: RuntimeVal,
    operator: string,
): BooleanVal {

    if (lhs.type == "boolean" && rhs.type == "boolean") {
        const b1 = (lhs as BooleanVal).value;
        const b2 = (rhs as BooleanVal).value;
        return MK_BOOL(compare(b1, b2, operator))
    } else if (lhs.type == "number" && rhs.type == "number") {
        const b1 = (lhs as NumberVal).value;
        const b2 = (rhs as NumberVal).value;
        return MK_BOOL(compare(b1, b2, operator))
    } else if (isRuntimeString(lhs) && isRuntimeString(rhs)) {
        const b1 = (lhs as StringVal).value;
        const b2 = (rhs as StringVal).value;
        return MK_BOOL(compare(b1, b2, operator))
    } else {
        throw "Comparison cannot be made between " + JSON.stringify(lhs) + " - " + JSON.stringify(rhs);
    }
}

export function eval_unary_expr(
    op: UnaryExpr,
    env: Environment,
): RuntimeVal {
    if (op.left.kind != "Identifier") {
        throw "Unary must be used with identifiers only"
    }

    const { symbol } = op.left as Identifier
    const variableVal = env.lookupVar(symbol);

    if (variableVal.type != "number") {
        throw "Unary must be used with numbers only"
    }

    const numberVal = variableVal as NumberVal

    if (op.operator == "++") {
        numberVal.value += 1;
        return env.assignVar(symbol, numberVal);
    } else if (op.operator == "--") {
        numberVal.value -= 1;
        return env.assignVar(symbol, numberVal);
    } else {
        throw "Unary operator not supported" + JSON.stringify(op)
    }
}
export function eval_binary_expr(
    binop: BinaryExpr,
    env: Environment,
): RuntimeVal {
    const lhs = evaluate(binop.left, env);
    const rhs = evaluate(binop.right, env);

    // comparison
    if (binop.operator == "==" || binop.operator == "!=" || binop.operator == ">=" || binop.operator == "<="
        || binop.operator == ">" || binop.operator == "<") {
        return eval_comparison_binary_expr(lhs, rhs, binop.operator)
    }

    const isLrhStr = isRuntimeString(lhs);
    const isRrhStr = isRuntimeString(rhs);

    //string concat
    if (isLrhStr && isRrhStr && binop.operator == "+") {
        return MK_STRING((lhs as StringVal).value + (rhs as StringVal).value);
    }

    if (isLrhStr && rhs.type == "number" && binop.operator == "+") {
        return MK_STRING((lhs as StringVal).value + (rhs as NumberVal).value);
    }

    if (lhs.type == "number" && isRrhStr && binop.operator == "+") {
        return MK_STRING((lhs as NumberVal).value + (rhs as StringVal).value);
    }

    // binary ops
    if (lhs.type == "number" && rhs.type == "number") {
        return eval_numeric_binary_expr(
            lhs as NumberVal,
            rhs as NumberVal,
            binop.operator,
        );
    }

    // One or both are NULL
    return MK_NULL();
}

export function eval_identifier(
    ident: Identifier,
    env: Environment,
): RuntimeVal {
    const val = env.lookupVar(ident.symbol)
    return val || MK_NULL();
}

export function eval_assignment(
    node: AssignmentExpr,
    env: Environment,
): RuntimeVal {
    if (node.assigne.kind !== "Identifier" && node.assigne.kind !== "MemberExpr") {    
        throw `Invalid LHS (must be identifier of member expression) inside assignment expr ${JSON.stringify(node.assigne)}`;
    }

    if (node.assigne.kind == "MemberExpr") {
        const target = node.assigne as MemberExpr
        const obj: ObjectVal = evaluate(target.object, env) as ObjectVal
        const value = evaluate(node.value, env)
        if (isRuntimeArray(obj)) {
            const arr = obj as ArrayVal
            arr.array[(target.property as NumericLiteral).value] = value
        } else {
            obj.properties.set((target.property as Identifier).symbol, value)
        }
        return value;        
    } else {
        const varname = (node.assigne as Identifier).symbol;
        return env.assignVar(varname, evaluate(node.value, env));
    }
}



export function eval_object_expr(
    obj: ObjectLiteral,
    env: Environment,
): RuntimeVal {
    const object = { type: "object", properties: new Map() } as ObjectVal;
    for (const { key, value } of obj.properties) {
        const runtimeVal = (value == undefined)
            ? env.lookupVar(key)
            : evaluate(value, env);

        object.properties.set(key, runtimeVal);
    }

    return object;
}

export function eval_body(body: Stmt[], scope: Environment, isBreakContinueEnabled: boolean = false): RuntimeVal {
    let result: RuntimeVal = MK_NULL();
    for (const stmt of body) {
        result = evaluate(stmt, scope);
        if (result.type == "functionReturn") {
            return result;
        }
        if (isBreakContinueEnabled && scope.isBreakSet) {
            return result;
        }

        if (isBreakContinueEnabled && scope.isContinueSet) {
            break;
        }
    }
    return result;
}

export function eval_return(ret: Return, scope: Environment): RuntimeVal {
    const retVal = ret.returnVal && ret.returnVal.length > 0 ? ret.returnVal.map(ret => evaluate(ret, scope)) : [MK_NULL()];
    return MK_FUNCTION_RETURN(retVal);
}

export function eval_break_continue(continueBreak: ContinueBreak, scope: Environment): RuntimeVal {
    scope.isContinueSet = continueBreak.isContinue
    scope.isBreakSet = !continueBreak.isContinue
    return MK_NULL();
}

export function eval_call_expr(expr: CallExpr, env: Environment): RuntimeVal {
    const args = expr.args.map((arg) => evaluate(arg, env));
    const fn = evaluate(expr.caller, env);

    if (fn.type == "native-fn") {
        return (fn as NativeFnVal).call(args, env);
    }

    if (fn.type == "function") {
        const val = eval_function(fn, args, env);
        if (val.type == "functionReturn") {
            const fr = val as FunctionReturn
            if (fr.values.length == 1) {            
                return fr.values[0]
            } 
        } 
        return val;
    }

    if (fn.type == "delegatedCall" && !(fn as DelegatedCall).areCallerAndCalleeAdded) {
        const call = fn as DelegatedCall;        
        call.callee = [args[0] as FunctionVal]
        call.areCallerAndCalleeAdded = true
        return call;
    } else if (fn.type == "delegatedCall") {
        const delCal = fn as DelegatedCall;
        return delCal.combinerFunction((call: RuntimeVal, args: RuntimeVal[]) => eval_function(call, args, env), delCal.caller, delCal.callee, args);
    }

    throw "Cannot call value that is not a function: " + JSON.stringify(fn);
}

export function eval_function(fn: RuntimeVal, args: RuntimeVal[], env:Environment) {
    const func = fn as FunctionVal;
    const scope = new Environment(func.declarationEnv, func);

    // Create the variables for the parameters list
    for (let i = 0; i < func.parameters.length; i++) {
        if (func.parameters.length < args.length) {
            throw "Missing required parameter for function " + JSON.stringify(func.parameters) + "  -  " + JSON.stringify(args) 
        }
        const varname = func.parameters[i];
        scope.declareVar(varname, args[i], false);
    }

    return eval_body(func.body, scope, false);

}

export function eval_if_expr(expr: IfExpr, env: Environment): RuntimeVal {
    const env2 = new Environment(env, expr);
    const condition = evaluate(expr.condition, env);
    if (condition.type != "boolean") {
        throw "If condition must be boolean: " + JSON.stringify(condition);
    }

    if ((condition as BooleanVal).value) {
        const ret = eval_body(expr.body, env2, true);
        //propagate return        
        env.isBreakSet = env2.isBreakSet;
        env.isContinueSet = env2.isContinueSet;
        return ret;
    }
    else if (expr.elseBody && expr.elseBody.length > 0) {
        const ret = eval_body(expr.elseBody, env2, true);
        //propagate return
        env.isBreakSet = env2.isBreakSet;
        env.isContinueSet = env2.isContinueSet;
        return ret;
    }
    else {
        return MK_NULL();
    }
}

export function eval_while_expr(expr: WhileExpr, env: Environment): RuntimeVal {
    const env2 = new Environment(env, expr);
    let condition = evaluate(expr.condition, env);
    if (condition.type != "boolean") {
        throw "If condition must be boolean: " + JSON.stringify(condition);
    }

    let resp: RuntimeVal = MK_NULL();
    while ((condition as BooleanVal).value) {
        env2.isContinueSet = false;
        resp = eval_body(expr.body, env2, true);
        condition = evaluate(expr.condition, env2);
        //propagate return
        if (resp.type == "functionReturn") {
            return resp;
        }
        //break and continue
        if (env2.isBreakSet) {
            env2.isBreakSet = false;
            break;
        }
    }
    return resp;
}


export function eval_for_expr(expr: ForExpr, env: Environment): RuntimeVal {
    const env2 = new Environment(env, expr);
    let variable = evaluate(expr.var, env2);
    let condition = evaluate(expr.condition, env2);

    if (condition.type != "boolean") {
        throw "While condition must be boolean: " + JSON.stringify(condition);
    }

    let resp: RuntimeVal = MK_NULL();
    while ((condition as BooleanVal).value) {
        env2.isContinueSet = false;
        resp = eval_body(expr.body, env2, true);
        evaluate(expr.increment, env2);
        condition = evaluate(expr.condition, env2);
        //propagate return
        if (resp.type == "functionReturn") {
            return resp;
        }
        //break and continue
        if (env2.isBreakSet) {
            env2.isBreakSet = false;
            break;
        }
    }
    return resp;
}


export function eval_member_expr(expr: MemberExpr, env: Environment): RuntimeVal {
    let obj = evaluate(expr.object, env);
    if (obj.type == "object") {
        if (obj.type != "object") {
            throw "Left right side of object member eval must be an object"
        }
        const objVal = obj as ObjectVal
        if (expr.property.kind != "Identifier" && expr.property.kind != "StringLiteral" && (expr.property.kind != "NumericLiteral" && isRuntimeArray(objVal))) {
            throw "Member must be an identifier/stringLiteral/numerical " + JSON.stringify(expr.property)
        }

        if (expr.property.kind == "NumericLiteral") {
            const num = (expr.property as NumericLiteral).value
            const arrayVal = obj as ArrayVal
            return arrayVal.array[num]
        }

        let val;
        if (expr.property.kind == "Identifier") {
            val = (expr.property as Identifier).symbol
        }

        if (expr.property.kind == "StringLiteral") {
            val = (expr.property as StringLiteral).value
        }

        return objVal.properties.get(val) || MK_NULL()
    } else if (obj.type == "function") {
        const objVal = obj as FunctionVal
        let val;
        if (expr.property.kind == "Identifier") {
            val = (expr.property as Identifier).symbol
        }

        if (expr.property.kind == "StringLiteral") {
            val = (expr.property as StringLiteral).value
        }
        if (!objVal.properties.has(val)) {
            throw "Function " + objVal.name + " does not have member " + val
        }
        return objVal.properties.get(val)
    }
}    