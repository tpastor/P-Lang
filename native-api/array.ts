import { FunctionCall, MK_BOOL, MK_NATIVE_FN, MK_NUMBER, NumberVal, RuntimeVal } from "../runtime/values";

export function createNativeArrayFunctions(array: RuntimeVal[]): Map<string, RuntimeVal> {
    const stringFunctions: Map<string, RuntimeVal> = new Map();
    stringFunctions.set("length", MK_NATIVE_FN(length(array)))
    stringFunctions.set("get", MK_NATIVE_FN(get(array)))
    stringFunctions.set("set", MK_NATIVE_FN(set(array)))
    stringFunctions.set("push", MK_NATIVE_FN(push(array)))
    stringFunctions.set("pop", MK_NATIVE_FN(pop(array)))
    stringFunctions.set("remove", MK_NATIVE_FN(remove(array)))
    stringFunctions.set("has", MK_NATIVE_FN(has(array)))
    return stringFunctions;
} 

function length(array: RuntimeVal[]): FunctionCall {
    return (args, scope) => {
        return MK_NUMBER(array.length)
    }
}

function pop(array: RuntimeVal[]): FunctionCall {
    return (args, scope) => {
        return array.pop()
    }
}

function push(array: RuntimeVal[]): FunctionCall {
    return (args, scope) => {
        if (args.length != 1) {
            throw "push must have one parameter " + JSON.stringify(args)
        }
        array.push(args[0])
        return args[0]
    }
}

function remove(array: RuntimeVal[]): FunctionCall {
    return (args, scope) => {
        if (args.length != 1) {
            throw "push must have one parameter " + JSON.stringify(args)
        }

        const index = args[0] as NumberVal
        const item = array[index.value]
        
        if (index.value > -1) {
            array.splice(index.value, 1);
        }
        return item
    }
}

function get(array: RuntimeVal[]): FunctionCall {
    return (args, scope) => {
        if (args.length != 1 && args[0].type != "number") {
            throw "parameter must be a number " + JSON.stringify(args)
        }
        return array[(args[0] as NumberVal).value];
    }
}

function set(array: RuntimeVal[]): FunctionCall {
    return (args, scope) => {
        if (args.length != 2 && args[0].type != "number") {
            throw "set must has 2 parameters and the first must be a number " + JSON.stringify(args)
        }
        return array[(args[0] as NumberVal).value] = args[1];
    }
}

function has(array: RuntimeVal[]): FunctionCall {
    return (args, scope) => {
        if (args.length != 1) {
            throw "has must have one parameter" + JSON.stringify(args)
        }
        return MK_BOOL(array.indexOf(args[0]) > 0);
    }
}