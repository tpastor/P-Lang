import { ArrayVal, BooleanVal, MK_ARRAY, MK_BOOL, MK_NATIVE_FN, MK_NUMBER, MK_OBJECT, MK_STRING, NumberVal, ObjectVal, RuntimeVal, StringVal, isRuntimeArray, isRuntimeString } from "../runtime/values";
import { getRuntimeValue } from "./base";

const denyListMethods = new Set(["constructor", "__defineGetter__", "__defineSetter__", "hasOwnProperty", "isPrototypeOf", "__lookupGetter__",
 "__lookupSetter__", "propertyIsEnumerable", "toString", "valueOf", "toLocaleString"])

export function convertNativeIntoObject(obj): RuntimeVal {
    return MK_OBJECT(convertNativeObjectIntoMap(obj))
}

export function convertObjectIntoNative(val: ObjectVal) {
    return Object.fromEntries(convertObjectIntoMap(val))
}

export function convertAnyRuntimeValIntoNative(val: RuntimeVal) {
    switch (val.type) {
        case "number":
            return (val as NumberVal).value
        case "boolean":
            return (val as BooleanVal).value
        case "object":
            return convertObjectIntoNative(val as ObjectVal);
        default:
            throw "Element does not have a runtime value " + JSON.stringify(val)
    }
}

function convertObjectIntoMap(val: ObjectVal) {
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
                map.set(key, convertObjectSpecialCases(value as ObjectVal) || convertObjectIntoMap(value as ObjectVal));
                break;                
        }
    }
    return map    
}

function convertObjectSpecialCases(obj:ObjectVal) {
    if (isRuntimeString(obj)) {
        return (obj as StringVal).value
    }
    else if (isRuntimeArray(obj)) {
        return (obj as ArrayVal).array.map(val => convertAnyRuntimeValIntoNative(val))
    } 
    return undefined
}

function convertNativeObjectIntoMap(obj) {
    const map: Map<string, RuntimeVal> = new Map();

    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val == "string") {
            map.set(key, MK_STRING((val as string)))
        }
        else if (typeof val == "number") {
            map.set(key, MK_NUMBER((val as number)))
        }
        else if (typeof val == "boolean") {
            map.set(key, MK_BOOL((val as boolean)))
        }
        else if (typeof val == "function") {
            map.set(key, MK_NATIVE_FN((call) => (val as Function).call(obj, ...call.map((rv) => getRuntimeValue(rv)))))
        }
        else if (typeof val == "object") {
            map.set(key, MK_OBJECT(convertNativeObjectIntoMap(val)))
        }
    }

    getMethods(obj).forEach(methodName => map.set(methodName, MK_NATIVE_FN((call) => (obj[methodName] as Function).call(obj, ...call.map((rv) => getRuntimeValue(rv))))))
    return map;
}

const getMethods = (obj):string[] => {
    let properties = new Set()
    let currentObj = obj
    do {
      Object.getOwnPropertyNames(currentObj).filter(item => !denyListMethods.has(item)).map(item => properties.add(item))
    } while ((currentObj = Object.getPrototypeOf(currentObj)))
    return Array.from(properties.keys()).filter((item) => typeof obj[item as number] === 'function') as string[]
  }