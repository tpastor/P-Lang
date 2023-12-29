import { Stmt } from "../comp/ast";
import { createNativeArrayFunctions } from "../native-api/array";
import { createNativeStringFunctions } from "../native-api/string";
import Environment from "./environment";

  export type ValueType = "null" | "number"|"boolean"|"object"|"native-fn"|"function";

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

  export interface ObjectVal extends RuntimeVal {
    type: "object";
    properties: Map<string, RuntimeVal>;
  }

  export interface NativeFnVal extends RuntimeVal {
    type: "native-fn";
    call: FunctionCall;
  }

  export interface FunctionVal extends RuntimeVal {
    type: "function";
    name: string,
    parameters: string[],
    declarationEnv: Environment,
    body: Stmt[],
  }

  export type FunctionCall = (args: RuntimeVal[], env: Environment) => RuntimeVal;


  export interface BooleanVal extends RuntimeVal {
    type: "boolean";
    value: boolean;
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

  export function MK_NATIVE_FN(call: FunctionCall) {
    return { type: "native-fn", call } as NativeFnVal;
  }

  export function isRuntimeString(object: RuntimeVal): boolean {
    return object.type == "object" && 'value' in object;
  }

  export function getObjectToString(object: ObjectVal): FunctionVal | undefined {
    const toString = object.properties.get("toString")
    if (toString && toString.type == "function") {
          return toString as FunctionVal;
    } else {
      return undefined;
    }
  }