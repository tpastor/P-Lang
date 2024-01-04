import Environment from "../runtime/environment";
import { eval_function } from "../runtime/eval/expressions";
import { ArrayVal, BooleanVal, FunctionReturn, FunctionVal, MK_ARRAY, MK_BOOL, MK_NATIVE_FN, MK_NULL, MK_NUMBER, MK_OBJECT, MK_STRING, NumberVal, ObjectVal, RuntimeVal, StringVal, isRuntimeArray, isRuntimeString } from "../runtime/values";
import { getRuntimeValue } from "./base";

const denyListMethods = new Set(["constructor", "__defineGetter__", "__defineSetter__", "hasOwnProperty", "isPrototypeOf", "__lookupGetter__",
 "__lookupSetter__", "propertyIsEnumerable", "toString", "valueOf", "toLocaleString", "__proto__"])

export function convertNativeIntoObject(obj): RuntimeVal {
    return MK_OBJECT(convertNativeObjectIntoMap(obj))
}

export function convertObjectIntoNative(val: ObjectVal, env: Environment) {
    return Object.fromEntries(convertObjectIntoMap(val, env))
}

export function convertAnyNativeIntoRuntimeVal(val): RuntimeVal {
    if (typeof val == "string") {
        return MK_STRING((val as string))
    }
    else if (typeof val == "number") {
        return MK_NUMBER((val as number))
    }
    else if (typeof val == "boolean") {
        return MK_BOOL((val as boolean))
    }
    else if (typeof val == "function") {
        return MK_NATIVE_FN((call) => (val as Function).call(null, ...call.map((rv) => getRuntimeValue(rv))))
    }
    else if (typeof val == "object") {
        return MK_OBJECT(convertNativeObjectIntoMap(val))
    } else {
        return MK_NULL()
    }
}

export function convertAnyRuntimeValIntoNative(val: RuntimeVal, env:Environment) {
    switch (val.type) {
        case "number":
            return (val as NumberVal).value
        case "boolean":
            return (val as BooleanVal).value
        case "function":
            const f = (val as FunctionVal)
            return (...args) => convertAnyRuntimeValIntoNative(eval_function(f, args.map(convertAnyNativeIntoRuntimeVal), env), env)                                
        case "functionReturn":
            return convertAnyRuntimeValIntoNative((val as FunctionReturn).values[0], env)
        case "object":
            return convertObjectIntoNative(val as ObjectVal, env);
        default:
            throw "Element does not have a runtime value " + JSON.stringify(val)
    }
}

function convertObjectIntoMap(val: ObjectVal, env: Environment) {
    const map = new Map();
    for (const [key, value] of val.properties) {
        switch (value.type) {
            case "number":
                map.set(key, (value as NumberVal).value)
                break;
            case "boolean":
                map.set(key, (value as BooleanVal).value)
                break;
            case "object":
                map.set(key, convertObjectSpecialCases(value as ObjectVal, env) || convertObjectIntoMap(value as ObjectVal, env));
                break;                
            case "function":
                const f = (value as FunctionVal)
                map.set(key, (...args) => convertAnyRuntimeValIntoNative(eval_function(f, args.map(convertAnyNativeIntoRuntimeVal), env), env))
                break;                                                
        }
    }
    return map    
}

function convertObjectSpecialCases(obj:ObjectVal, env: Environment) {
    if (isRuntimeString(obj)) {
        return (obj as StringVal).value
    }
    else if (isRuntimeArray(obj)) {
        return (obj as ArrayVal).array.map(val => convertAnyRuntimeValIntoNative(val, env))
    } 
    return undefined
}

function convertNativeObjectIntoMap(obj) {
    const map: Map<string, RuntimeVal> = new Map();

    for (const prop of getProps(obj)) {
        const {val} = prop;
        const name = prop.name as string
        if (typeof val == "string") {
            map.set(name, MK_STRING((val as string)))
        }
        else if (typeof val == "number") {
            map.set(name, MK_NUMBER((val as number)))
        }
        else if (typeof val == "boolean") {
            map.set(name, MK_BOOL((val as boolean)))
        }
        else if (typeof val == "function") {
            map.set(name, MK_NATIVE_FN((call) => convertAnyNativeIntoRuntimeVal((val as Function).call(obj, ...call.map((rv) => getRuntimeValue(rv))))))
        }
        else if (typeof val == "object") {
            map.set(name, MK_OBJECT(convertNativeObjectIntoMap(val)))
        }
    }
    
    return map;
}

  const getProps = (obj) => {
    let properties = new Set()
    let currentObj = obj
    do {
      Object.getOwnPropertyNames(currentObj).filter(item => !denyListMethods.has(item)).map(item => properties.add(item))
    } while ((currentObj = Object.getPrototypeOf(currentObj)))
    return Array.from(properties.keys()).map((item) => ({ type: typeof obj[item as number], val: obj[item as number], name: item }) ) 
  }