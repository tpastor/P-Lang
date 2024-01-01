import Environment from "../runtime/environment";
import { eval_function } from "../runtime/eval/expressions";
import { ArrayVal, BooleanVal, FunctionVal, MK_ARRAY, MK_BOOL, MK_NATIVE_FN, MK_NULL, MK_NUMBER, MK_OBJECT, MK_STRING, NumberVal, ObjectVal, RuntimeVal, StringVal, getObjectToString, isRuntimeArray, isRuntimeString } from "../runtime/values";
import { convertNativeIntoObject } from "./bridge";
import { makeGet, makePost } from "./http";
const fs = require('fs');

export function createGlobalEnv() {
    const env = new Environment();
    env.declareVar("true", MK_BOOL(true), true);
    env.declareVar("false", MK_BOOL(false), true);
    env.declareVar("null", MK_NULL(), true);
    env.declareVar("sleep", MK_NATIVE_FN(sleep), true)
    env.declareVar("print", MK_NATIVE_FN(print), true)
    env.declareVar("system", MK_NATIVE_FN(system), true)
    env.declareVar("listObjectProps", MK_NATIVE_FN(list), true)
    env.declareVar("listVariables", MK_NATIVE_FN(variables), true)
    env.declareVar("mergeObj", MK_NATIVE_FN(merge), true)
    env.declareVar("remotePropObj", MK_NATIVE_FN(remove), true)
    env.declareVar("httpGet", MK_NATIVE_FN(httpGet), true)
    env.declareVar("httpPost", MK_NATIVE_FN(httpPost), true)
    env.declareVar("readFile", MK_NATIVE_FN(readFile), true)
    env.declareVar("writeFile", MK_NATIVE_FN(writeFile), true)
    env.declareVar("array", MK_NATIVE_FN(array), true)
    env.declareVar("exit", MK_NATIVE_FN((args, scope) => {
        process.exit((args[0] as NumberVal).value)
    }), true)

    env.declareVar("time", MK_NATIVE_FN((args, scope) => {
        return MK_NUMBER(Date.now())
    }), true)

    env.declareVar("assert", MK_NATIVE_FN((args, scope) => {
        if (getRuntimeValue(args[0]) != getRuntimeValue(args[1])) {
            throw "Elements " + JSON.stringify(args) + " should be the same"
        }
        return MK_NULL();
    }), true)

    return env;
}

export function array(args: RuntimeVal[], scope: Environment) {
    return MK_ARRAY(args)
};

export function httpGet(args: RuntimeVal[], scope: Environment): RuntimeVal {
    return convertNativeIntoObject(makeGet((args[0] as StringVal).value))
}

export function httpPost(args: RuntimeVal[], scope: Environment): RuntimeVal {
    return convertNativeIntoObject(makePost((args[0] as StringVal).value, (args[1] as StringVal).value))
}

export function readFile(args: RuntimeVal[], scope: Environment) {
    if (args.length == 0 || args[0].type != "object") {
        throw "Expected string as first argument with filename"
    }

    const data = fs.readFileSync(getRuntimeValue(args[0]),
        { encoding: 'utf8', flag: 'r' });
    return MK_STRING(data)
};

export function writeFile(args: RuntimeVal[], scope: Environment) {
    if (args.length < 2 || args[0].type != "object" || args[1].type != "object") {
        throw "Expected string as first argument with filename and data string as the second"
    }

    fs.writeFileSync(getRuntimeValue(args[0]), getRuntimeValue(args[1]));
    return MK_NULL()
};

export function remove(args: RuntimeVal[], scope: Environment) {
    (args[0] as ObjectVal).properties.delete((args[1] as StringVal).value)
    return args[0]
}

export function list(args: RuntimeVal[], scope: Environment) {
    return MK_ARRAY([...(args[0] as ObjectVal).properties.keys()].map(key => MK_STRING(key)))
}

export function variables(args: RuntimeVal[], scope: Environment) {
    return MK_ARRAY(scope.getVariablesInLocalScope().map(MK_STRING))
}

export function merge(args: RuntimeVal[], scope: Environment) {
    return MK_OBJECT(args.map(rt => rt as ObjectVal).map(obj => obj.properties).reduce((accum, newVal) => new Map([...accum.entries(), ...newVal.entries()]), new Map<string, RuntimeVal>()))
}

export function system(args: RuntimeVal[], scope: Environment) {
    return MK_STRING(require('child_process').execSync((args[0] as StringVal).value).toString());
}

export function sleep(args: RuntimeVal[], scope: Environment) {
    const {execSync} = require('child_process');
    execSync('sleep ' + (args[0] as NumberVal).value);
    return MK_NULL()
}

export function print(args: RuntimeVal[], scope: Environment) {
    args.forEach(arg => {
        switch (arg.type) {
            case "object":
                const isArray: boolean = isRuntimeArray(arg)
                if (isArray) {
                    const array = arg as ArrayVal
                    console.log("[" + array.array.map(item => getRuntimeValue(item)).join(",") + "]");
                    break;
                }
                const toString: FunctionVal = getObjectToString(arg as ObjectVal)
                if (toString) {
                    print([eval_function(toString, [], scope)], scope)
                } else {
                    console.log(getRuntimeValue(arg))
                }
                break;
            case "number":
            case "boolean":
                console.log(getRuntimeValue(arg))
                break;
            default:
                console.log(arg)
        }
    })
    return MK_NULL()
};


export function getRuntimeValue(val: RuntimeVal) {
    switch (val.type) {
        case "number":
            return (val as NumberVal).value
        case "boolean":
            return (val as BooleanVal).value
        case "object":
            return isRuntimeString(val) ? (val as StringVal).value : val;
        case "null":
            return null
        default:
            throw "Element does not have a runtime value " + JSON.stringify(val)
    }

}