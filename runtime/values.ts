import { FunctionDeclaration, Stmt } from "../comp/ast";
import { createNativeArrayFunctions } from "../native-api/array";
import { createFunctionExtensions, createNativeFunctionExtensions } from "../native-api/functions";
import { createNativeStringFunctions } from "../native-api/string";
import Environment from "./environment";

  export type ValueType = "null" | "number"|"boolean"|"object"|"native-fn"|"function"|"delegatedCall"|"functionReturn";

  export interface RuntimeVal {
    type: ValueType;
  }

  /**
   * Defines a value of undefined meaning
   */
  export interface NullVal extends RuntimeVal {
    type: "null";
    value: null;
  }

  export interface NumberVal extends RuntimeVal {
    type: "number";
    value: number;
  }

  export interface ArrayVal extends ObjectVal {  
    array: RuntimeVal[],
  }

  export interface StringVal extends ObjectVal {  
    value: string,
  }

  export interface FunctionReturn extends RuntimeVal {  
    type: "functionReturn";
    values: RuntimeVal[];
  }

  export interface ObjectVal extends RuntimeVal {
    type: "object";
    properties: Map<string, RuntimeVal>;
  }

  export interface NativeFnVal extends RuntimeVal {
    type: "native-fn";
    call: FunctionCall;
    properties: Map<string, RuntimeVal>;
  }

  export interface FunctionVal extends RuntimeVal {
    type: "function";
    name: string,
    parameters: string[],
    declarationEnv: Environment,
    body: Stmt[],
    properties: Map<string, RuntimeVal>;
  }

  export type FunctionCall = (args: RuntimeVal[], env: Environment) => RuntimeVal;

  export type EvalFunction = (call: RuntimeVal, args: RuntimeVal[]) => RuntimeVal;

  export type CombineFunction = (evalFunction: EvalFunction, caller: FunctionVal, callee: FunctionVal[], args: RuntimeVal[]) => RuntimeVal;

  export interface BooleanVal extends RuntimeVal {
    type: "boolean";
    value: boolean;
  }

  export interface DelegatedCall extends RuntimeVal {
    type: "delegatedCall";  
    combinerFunction: CombineFunction;
    areCallerAndCalleeAdded: boolean;
    caller: FunctionVal;
    callee: FunctionVal[];
  }

  export function MK_DELEGATED_FUNCTION(func:CombineFunction, caller: FunctionVal, callee: FunctionVal[]) {
    return { type: "delegatedCall", areCallerAndCalleeAdded: false, combinerFunction: func, callee, caller } as DelegatedCall;
  }

  export function MK_NUMBER(n = 0) {
    return { type: "number", value: n } as NumberVal;
  }

  export function MK_NULL() {
    return { type: "null", value: null } as NullVal;
  }

  export function MK_STRING(value: string) {
    return { type: "object", value: value, properties: createNativeStringFunctions(value) } as StringVal;
  }

  export function MK_ARRAY(array: RuntimeVal[]) {
    return { type: "object", array: array, properties: createNativeArrayFunctions(array) } as ArrayVal;
  }

  export function MK_BOOL(b = true) {
    return { type: "boolean", value: b } as BooleanVal;
  }

  export function MK_OBJECT(properties: Map<string, RuntimeVal>) {
    return { type: "object", properties } as ObjectVal;
  }


  export function MK_FUNCTION_RETURN(values: RuntimeVal[]) {
    return { type: "functionReturn", values } as FunctionReturn;
  }

  export function MK_NATIVE_FN(call: FunctionCall) {
    return { type: "native-fn", call, properties: createNativeFunctionExtensions(call) } as NativeFnVal;
  }

  export function isRuntimeString(object: RuntimeVal): boolean {
    return object.type == "object" && 'value' in object;
  }

  export function isRuntimeArray(object: RuntimeVal): boolean {
    return object.type == "object" && 'array' in object;
  }

  export function getObjectToString(object: ObjectVal): FunctionVal | undefined {
    const toString = object.properties.get("toString")
    if (toString && toString.type == "function") {
          return toString as FunctionVal;
    } else {
      return undefined;
    }
  }