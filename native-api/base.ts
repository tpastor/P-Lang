import Environment from "../runtime/environment";
import { eval_call_expr, eval_function } from "../runtime/eval/expressions";
import { BooleanVal, FunctionCall, FunctionVal, MK_ARRAY, MK_BOOL, MK_NATIVE_FN, MK_NULL, MK_NUMBER, MK_STRING, NumberVal, ObjectVal, RuntimeVal, StringVal, getObjectToString, isRuntimeString } from "../runtime/values";
const fs = require('fs');

export function createGlobalEnv() {
    const env = new Environment();
    env.declareVar("true", MK_BOOL(true), true);
    env.declareVar("false", MK_BOOL(false), true);
    env.declareVar("null", MK_NULL(), true);
    env.declareVar("print", MK_NATIVE_FN(print), true)
    env.declareVar("readFile", MK_NATIVE_FN(readFile), true)
    env.declareVar("writeFile", MK_NATIVE_FN(writeFile), true)
    env.declareVar("array", MK_NATIVE_FN(array), true)
    env.declareVar("exit", MK_NATIVE_FN((args, scope) => { 
        process.exit((args[0] as NumberVal).value)
    }), true)

    env.declareVar("time", MK_NATIVE_FN((args, scope) => { 
        return MK_NUMBER(Date.now())
    }), true)
  
    return env;
  }

  export function array(args: RuntimeVal[], scope: Environment) { 
    return MK_ARRAY(args) 
};

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

export function print(args: RuntimeVal[], scope: Environment) { 
    args.forEach(arg => {
        switch(arg.type) {
            case "object":
                const toString:FunctionVal = getObjectToString(arg as ObjectVal)
                if (toString) {
                    print([eval_function(toString, [])], scope)
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


export function getRuntimeValue(val:RuntimeVal) {
    switch(val.type) {
        case "number":
            return (val as NumberVal).value                
        case "boolean":                    
            return (val as BooleanVal).value
        case "object":                    
            return isRuntimeString(val) ? (val as StringVal).value : val;
        default:
            throw "Element does not have a runtime value " + JSON.stringify(val)
    }        

}