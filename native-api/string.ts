import { FunctionCall, MK_ARRAY, MK_NATIVE_FN, MK_NUMBER, MK_STRING, NumberVal, ObjectVal, RuntimeVal, StringVal } from "../runtime/values";
import { getRuntimeValue } from "./base";

export function createNativeStringFunctions(str: string): Map<string, RuntimeVal> {
    const stringFunctions: Map<string, RuntimeVal> = new Map();
    stringFunctions.set("length", MK_NUMBER(str.length))
    stringFunctions.set("charAt", MK_NATIVE_FN(chartAt(str)))
    stringFunctions.set("substring", MK_NATIVE_FN(substring(str)))
    stringFunctions.set("lowercase", MK_NATIVE_FN(lowercase(str)))
    stringFunctions.set("uppercase", MK_NATIVE_FN(uppercase(str)))
    stringFunctions.set("split", MK_NATIVE_FN(split(str)))
    return stringFunctions;
} 

function split(str: string): FunctionCall {
    return (args, scope) => {
        if (args.length != 1 && args[0].type != "object") {
            throw "parameter must be a string " + JSON.stringify(args)
        }
        return MK_ARRAY(str.split((args[0] as StringVal).value).map((str) => MK_STRING(str)))
    }
}

function chartAt(str: string): FunctionCall {
    return (args, scope) => {
        if (args.length != 1 && args[0].type != "number") {
            throw "parameter must be a number " + JSON.stringify(args)
        }
        return MK_STRING(str.charAt(getRuntimeValue(args[0]) as number))
    }
}

function substring(str: string): FunctionCall {
    return (args, scope) => {
        return MK_STRING(str.substring(getRuntimeValue(args[0]) as number, getRuntimeValue(args[1]) as number))
    }
}

function uppercase(str: string): FunctionCall {
    return (args, scope) => {
        return MK_STRING(str.toUpperCase())
    }
}

function lowercase(str: string): FunctionCall {
    return (args, scope) => {
        return MK_STRING(str.toLowerCase())
    }
}