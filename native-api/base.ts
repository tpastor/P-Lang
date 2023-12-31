import Environment from "../runtime/environment";
import { eval_function } from "../runtime/eval/expressions";
import { ArrayVal, FunctionVal, MK_ARRAY, MK_BOOL, MK_NATIVE_FN, MK_NULL, MK_NUMBER, MK_OBJECT, MK_STRING, NumberVal, ObjectVal, RuntimeVal, StringVal, getObjectToString, isRuntimeArray, isRuntimeString } from "../runtime/values";
import { convertNativeIntoObject, getNativeValueFromRuntimeValue } from "./bridge";
import { makeGet, makePost } from "./http";
import fs = require('fs');

let __globalBaseEnv = null;

export function createGlobalEnv() {
    if (__globalBaseEnv == null) {
        __globalBaseEnv = createBaseGlobalEnv()
    }
    const env = new Environment();
    __globalBaseEnv.getVariablesInLocalScope().map(v => env.declareVar(v, __globalBaseEnv.lookupVar(v), true, false))
    return env;
}

function createBaseGlobalEnv() {
    const env = new Environment();
    env.declareVar("true", MK_BOOL(true), true, false);
    env.declareVar("false", MK_BOOL(false), true, false);
    env.declareVar("null", MK_NULL(), true, false);
    env.declareVar("sleep", MK_NATIVE_FN(sleep), true, false)
    env.declareVar("print", MK_NATIVE_FN(print), true, false)
    env.declareVar("system", MK_NATIVE_FN(system), true, false)
    env.declareVar("typeof", MK_NATIVE_FN(typeofVar), true, false)
    env.declareVar("listObjectProps", MK_NATIVE_FN(list), true, false)
    env.declareVar("listVariables", MK_NATIVE_FN(variables), true, false)
    env.declareVar("mergeObj", MK_NATIVE_FN(merge), true, false)
    env.declareVar("remotePropObj", MK_NATIVE_FN(remove), true, false)
    env.declareVar("httpGet", MK_NATIVE_FN(httpGet), true, false)
    env.declareVar("httpPost", MK_NATIVE_FN(httpPost), true, false)
    env.declareVar("readFile", MK_NATIVE_FN(readFile), true, false)
    env.declareVar("writeFile", MK_NATIVE_FN(writeFile), true, false)
    env.declareVar("array", MK_NATIVE_FN(array), true, false)
    env.declareVar("exit", MK_NATIVE_FN((args, scope) => {
        process.exit((args[0] as NumberVal).value)
    }), true, false)

    env.declareVar("time", MK_NATIVE_FN((args, scope) => {
        return MK_NUMBER(Date.now())
    }), true, false)

    env.declareVar("assert", MK_NATIVE_FN((args, scope) => {
        if (getNativeValueFromRuntimeValue(args[0]) != getNativeValueFromRuntimeValue(args[1])) {
            throw "Elements " + JSON.stringify(args) + " should be the same"
        }
        return MK_NULL();
    }), true, false)

    env.declareVar("assertNotNull", MK_NATIVE_FN((args, scope) => {
        if (getNativeValueFromRuntimeValue(args[0]) != null) {
            throw "Element " + JSON.stringify(args) + " should not be null"
        }
        return MK_NULL();
    }), true, false)

    env.declareVar("math", convertNativeIntoObject(Math), true, false)

    return env;
}

function array(args: RuntimeVal[], scope: Environment) {
    return MK_ARRAY(args)
};

function httpGet(args: RuntimeVal[], scope: Environment): RuntimeVal {
    return convertNativeIntoObject(makeGet((args[0] as StringVal).value))
}

function httpPost(args: RuntimeVal[], scope: Environment): RuntimeVal {
    return convertNativeIntoObject(makePost((args[0] as StringVal).value, (args[1] as StringVal).value))
}

function readFile(args: RuntimeVal[], scope: Environment) {
    if (args.length == 0 || args[0].type != "object") {
        throw "Expected string as first argument with filename"
    }

    const data = fs.readFileSync(getNativeValueFromRuntimeValue(args[0]) as string,
        { encoding: 'utf8', flag: 'r' });
    return MK_STRING(data)
};

function writeFile(args: RuntimeVal[], scope: Environment) {
    if (args.length < 2 || args[0].type != "object" || args[1].type != "object") {
        throw "Expected string as first argument with filename and data string as the second"
    }

    fs.writeFileSync(getNativeValueFromRuntimeValue(args[0]) as string, getNativeValueFromRuntimeValue(args[1]) as string);
    return MK_NULL()
};

function remove(args: RuntimeVal[], scope: Environment) {
    (args[0] as ObjectVal).properties.delete((args[1] as StringVal).value)
    return args[0]
}

function list(args: RuntimeVal[], scope: Environment) {
    return MK_ARRAY([...(args[0] as ObjectVal).properties.keys()].map(key => MK_STRING(key)))
}

function typeofVar(args: RuntimeVal[], scope: Environment) {
    if (args[0].type == "object") {
        if (isRuntimeArray(args[0])) {
            return MK_STRING("array")
        } else if (isRuntimeString(args[0])) {
            return MK_STRING("string")
        } else {
            return MK_STRING("object")
        }
    }
    return MK_STRING(args[0].type)
}

function variables(args: RuntimeVal[], scope: Environment) {
    return MK_ARRAY(scope.getVariablesInLocalScope().map(MK_STRING))
}

function merge(args: RuntimeVal[], scope: Environment) {
    return MK_OBJECT(args.map(rt => rt as ObjectVal).map(obj => obj.properties).reduce((accum, newVal) => new Map([...accum.entries(), ...newVal.entries()]), new Map<string, RuntimeVal>()))
}

function system(args: RuntimeVal[], scope: Environment) {
    return MK_STRING(require('child_process').execSync((args[0] as StringVal).value).toString());
}

function sleep(args: RuntimeVal[], scope: Environment) {
    const { execSync } = require('child_process');
    execSync('sleep ' + (args[0] as NumberVal).value);
    return MK_NULL()
}

function print(args: RuntimeVal[], scope: Environment) {
    args.forEach(arg => {
        switch (arg.type) {
            case "object":
                const isArray: boolean = isRuntimeArray(arg)
                if (isArray) {
                    const array = arg as ArrayVal
                    console.log("[" + array.array.map(item => getNativeValueFromRuntimeValue(item)).join(",") + "]");
                    break;
                }
                const toString: FunctionVal = getObjectToString(arg as ObjectVal)
                if (toString) {
                    print([eval_function(toString, [], scope)], scope)
                } else {
                    console.log(getNativeValueFromRuntimeValue(arg))
                }
                break;
            case "number":
            case "boolean":
                console.log(getNativeValueFromRuntimeValue(arg))
                break;
            default:
                console.log(arg)
        }
    })
    return MK_NULL()
};