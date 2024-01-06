import { FunctionCall, MK_ARRAY, MK_BOOL, MK_NATIVE_FN, MK_NUMBER, MK_STRING, NumberVal, ObjectVal, RuntimeVal, StringVal } from "../runtime/values";
import { convertAnyNativeIntoRuntimeVal, getNativeValueFromRuntimeValue } from "./bridge";

export function createNativeStringFunctions(str: string): Map<string, RuntimeVal> {
    const stringFunctions: Map<string, RuntimeVal> = new Map();
    stringFunctions.set("isEmpty", MK_BOOL(str.length == 0))
    stringFunctions.set("length", MK_NUMBER(str.length))
    stringFunctions.set("charAt", MK_NATIVE_FN(chartAt(str)))
    stringFunctions.set("substring", MK_NATIVE_FN(substring(str)))
    stringFunctions.set("lowercase", MK_NATIVE_FN(lowercase(str)))
    stringFunctions.set("uppercase", MK_NATIVE_FN(uppercase(str)))
    stringFunctions.set("split", MK_NATIVE_FN(split(str)))
    stringFunctions.set("replace", MK_NATIVE_FN(replace(str)))
    stringFunctions.set("contains", MK_NATIVE_FN(contains(str)))
    stringFunctions.set("startsWith", MK_NATIVE_FN(startsWith(str)))
    stringFunctions.set("indexOf", MK_NATIVE_FN(indexOf(str)))
    stringFunctions.set("lastIndexOf", MK_NATIVE_FN(lastIndexOf(str)))
    stringFunctions.set("true", MK_NATIVE_FN(trim(str)))
    stringFunctions.set("match", MK_NATIVE_FN(match(str)))
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

function replace(str: string): FunctionCall {
    return (args, scope) => {
        if (args.length == 2) {
            return MK_STRING(str.replace((args[0] as StringVal).value, (args[1] as StringVal).value))
        } else if (args.length == 3) {
            if (getNativeValueFromRuntimeValue(args[2]) == true) {
                return MK_STRING(str.replace(new RegExp((args[0] as StringVal).value), (args[1] as StringVal).value))
            } else {
                return MK_STRING(str.replace((args[0] as StringVal).value, (args[1] as StringVal).value))
            }
        }
    }
}

function chartAt(str: string): FunctionCall {
    return (args, scope) => {
        if (args.length != 1 && args[0].type != "number") {
            throw "parameter must be a number " + JSON.stringify(args)
        }
        return MK_STRING(str.charAt(getNativeValueFromRuntimeValue(args[0]) as number))
    }
}

function match(str: string): FunctionCall {
    return (args, scope) => {
        if (args.length != 1 && args[0].type != "number") {
            throw "parameter must be a number " + JSON.stringify(args)
        }
        return convertAnyNativeIntoRuntimeVal(str.match((args[0] as StringVal).value))
    }
}

function substring(str: string): FunctionCall {
    return (args, scope) => {
        return MK_STRING(str.substring(getNativeValueFromRuntimeValue(args[0]) as number, getNativeValueFromRuntimeValue(args[1]) as number))
    }
}

function contains(str: string): FunctionCall {
    return (args, scope) => {
        return MK_BOOL(str.indexOf((args[0] as StringVal).value) > -1)
    }
}

function startsWith(str: string): FunctionCall {
    return (args, scope) => {
        return MK_BOOL(str.startsWith((args[0] as StringVal).value))
    }
}

function indexOf(str: string): FunctionCall {
    return (args, scope) => {
        return MK_NUMBER(str.indexOf((args[0] as StringVal).value))
    }
}

function lastIndexOf(str: string): FunctionCall {
    return (args, scope) => {
        return MK_NUMBER(str.lastIndexOf((args[0] as StringVal).value))
    }
}

function uppercase(str: string): FunctionCall {
    return (args, scope) => {
        return MK_STRING(str.toUpperCase())
    }
}

function trim(str: string): FunctionCall {
    return (args, scope) => {
        return MK_STRING(str.trim())
    }
}

function lowercase(str: string): FunctionCall {
    return (args, scope) => {
        return MK_STRING(str.toLowerCase())
    }
}