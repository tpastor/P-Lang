import Environment from "../runtime/environment";
import { RuntimeVal, MK_NUMBER, MK_NATIVE_FN, FunctionCall, FunctionVal, DelegatedCall, MK_DELEGATED_FUNCTION, EvalFunction } from "../runtime/values";

export function createFunctionExtensions(call: FunctionVal, env: Environment): Map<string, RuntimeVal> {
    const stringFunctions: Map<string, RuntimeVal> = new Map();
    stringFunctions.set("paramCount", MK_NUMBER(call.parameters.length))    
    stringFunctions.set("andThen", MK_DELEGATED_FUNCTION((evalFunction: EvalFunction, caller: FunctionVal, callee: FunctionVal[], args: RuntimeVal[]) =>  {
        return evalFunction(callee[0], [evalFunction(caller, args)])
    }, call, null))    
    return stringFunctions;
} 

export function createNativeFunctionExtensions(call: FunctionCall): Map<string, RuntimeVal> {
    const stringFunctions: Map<string, RuntimeVal> = new Map();
    return stringFunctions;
}