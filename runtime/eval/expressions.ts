import * as ts from "typescript";
import { AssignmentExpr, BinaryExpr, CallExpr, ContinueBreak, EvaluatedExpr, ForExpr, ForeachExpr, Identifier, IfExpr, MemberExpr, NativeBlock, NumericLiteral, ObjectLiteral, Return, Stmt, StringLiteral, UnaryExpr, VarDeclaration, WhileExpr } from "../../comp/ast";
import { evaluate } from "../interpreter";
import { ArrayVal, BooleanVal, DelegatedCall, FunctionReturn, FunctionVal, MK_BOOL, MK_FUNCTION_RETURN, MK_NULL, MK_NUMBER, MK_STRING, NativeFnVal, NumberVal, ObjectVal, RuntimeVal, StringVal, isRuntimeArray, isRuntimeString } from "../values";
import { convertAnyNativeIntoRuntimeVal, convertAnyRuntimeValIntoNative } from "../../native-api/bridge";
import { getRuntimeValue } from "../../native-api/base";
import Environment from "../environment";

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

    if (op.operator == "!") {
        const val = evaluate(op.left, env)
        if (val.type != "boolean") {
            throw "Negation must be used with boolean only"
        }
        return MK_BOOL(!(val as BooleanVal).value)
    } else {
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
    const fn = evaluate(expr.callName, env);

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

export function eval_function(fn: RuntimeVal, args: RuntimeVal[], env: Environment) {
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

export function eval_foreach_expr(expr: ForeachExpr, env: Environment): RuntimeVal {
    const env2 = new Environment(env, expr);
    evaluate(expr.var, env2);
    const iterable = evaluate(expr.iterable, env)

    if (expr.var.kind != "VarDeclaration") {
        throw "Foreach var can only be var declaration " + JSON.stringify(expr.var)
    }

    if (!isRuntimeArray(iterable)) {
        throw "Foreach can only be used with array " + JSON.stringify(iterable)
    }

    const array = iterable as ArrayVal

    let resp: RuntimeVal = MK_NULL();
    let i: number = 0;
    let j: number = 0;
    let varName = (expr.var as VarDeclaration).identifier[0] + "_index"
    while (env.checkVarExists(varName, false)) {
        varName += ++j
    }

    env2.declareVar(varName, MK_NUMBER(0), false)
    while (i < array.array.length) {
        env2.assignVar((expr.var as VarDeclaration).identifier[0], array.array[i])
        env2.assignVar(varName, MK_NUMBER(i))
        env2.isContinueSet = false;
        resp = eval_body(expr.body, env2, true);
        i++
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

    if (expr.property.kind == "CallExpr") {
        const call = (expr.property as CallExpr)
        let nCall: CallExpr = JSON.parse(JSON.stringify(expr.property));
        nCall.callName = {
            kind: "MemberExpr",
            object: expr.object,
            property: call.callName,
            computed: false,
            tokenForDebug: expr.tokenForDebug
        } as MemberExpr;
        const ret = evaluate(nCall, env)
        if (ret.type == "functionReturn") {
            return (ret as FunctionReturn).values[0]
        }
        return ret
    }

    let obj = evaluate(expr.object, env);
    if (obj.type == "object") {
        if (obj.type != "object") {
            throw "Left right side of object member eval must be an object"
        }

        const objVal = obj as ObjectVal
        if (expr.property.kind == "NumericLiteral") {
            const num = (expr.property as NumericLiteral).value
            const arrayVal = obj as ArrayVal
            return arrayVal.array[num]
        }

        let val;
        if (expr.property.kind == "Identifier") {
            val = (expr.property as Identifier).symbol
        } else if (expr.property.kind == "StringLiteral") {
            val = (expr.property as StringLiteral).value
        } else if (expr.property.kind == "MemberExpr") {
            const member = expr.property as MemberExpr
            return mergeObjMemberExpr(member, objVal, env);
        } else {
            val = getRuntimeValue(evaluate(expr.property, env))
            const arrayVal = obj as ArrayVal
            return arrayVal.array[val]
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
        return objVal.properties.get(val) || MK_NULL()
    }
}

export function eval_native_block(declaration: NativeBlock, env: Environment): RuntimeVal {
    const funcAlias = new Map()
    const nativeParams = declaration.parameters
        .map(v => ({ name: v.symbol, value: env.lookupVar(v.symbol) }))
        .map(obj => {
            if (obj.value.type == "function") {
                const runtimeVal = convertAnyRuntimeValIntoNative(obj.value, env)
                funcAlias.set(obj.name, runtimeVal)
                return { name: obj.name, value: obj.name }
            } else {
                return { name: obj.name, value: convertAnyRuntimeValIntoNative(obj.value, env) }
            }
        })
        .map(obj => "let " + obj.name + " = " + obj.value)
        .join(";")

    //let code = "(function() { " + nativeParams + ";" + declaration.sourceCode + '}())'; --> TODO: move to Function and bind function alias scope
    const _MANAGED_ = Object.fromEntries(funcAlias);
    let code = nativeParams + ";" + declaration.sourceCode;
    let result = ts.transpile(code);
    const resp = eval(result)
    return convertAnyNativeIntoRuntimeVal(resp)
}

function mergeObjMemberExpr(property: MemberExpr, obj: ObjectVal, env: Environment) {
    if (property.object.kind == "Identifier") {
        const ident = property.object as Identifier
        const retVal = obj.properties.get(ident.symbol)
        if (retVal == null) {
            throw "cannot access property that does not exist from object " + JSON.stringify(ident)
        }
        property.object = { kind: "EvaluatedExpr", evaluatedVal: retVal } as EvaluatedExpr
        return evaluate(property, env)
    } else if (property.object.kind == "CallExpr") {
        const ident = property.object as CallExpr
        const ttt = evaluate({
            kind: "MemberExpr",
            object: { kind: "EvaluatedExpr", evaluatedVal: obj } as EvaluatedExpr,
            property: ident,
            computed: false,
            tokenForDebug: property.tokenForDebug
        } as MemberExpr, env)
        property.object = { kind: "EvaluatedExpr", evaluatedVal: ttt } as EvaluatedExpr
        return evaluate(property, env)
    } else if (property.object.kind == "MemberExpr") {
        const proObj = property.object as MemberExpr

        const ttt = evaluate({
            kind: "MemberExpr",
            object: { kind: "EvaluatedExpr", evaluatedVal: obj } as EvaluatedExpr,
            property: proObj.object,
            computed: false,
            tokenForDebug: property.tokenForDebug
        } as MemberExpr, env)

        const ttt2 = evaluate({
            kind: "MemberExpr",
            object: { kind: "EvaluatedExpr", evaluatedVal: ttt } as EvaluatedExpr,
            property: proObj.property,
            computed: false,
            tokenForDebug: property.tokenForDebug
        } as MemberExpr, env)

        property.object = { kind: "EvaluatedExpr", evaluatedVal: ttt2 } as EvaluatedExpr

        if (property.property.kind == "MemberExpr") {
            return evaluate(property, env)
        } else if (property.property.kind == "NumericLiteral" && isRuntimeArray(obj)) {
            const ident = property.object as MemberExpr
            const num = (property.property as NumericLiteral).value
            const ttt = evaluate({
                kind: "MemberExpr",
                object: { kind: "EvaluatedExpr", evaluatedVal: (obj as ArrayVal).array[num] } as EvaluatedExpr,
                property: ident.object,
                computed: false,
                tokenForDebug: property.tokenForDebug
            } as MemberExpr, env)
            property.object = { kind: "EvaluatedExpr", evaluatedVal: ttt } as EvaluatedExpr
            return evaluate(property, env)
        } else {
            throw "Unsupported member access chain " + JSON.stringify(property)
        }
    } else {
        throw "Could not handle MemberExpr " + JSON.stringify(property)
    }
}