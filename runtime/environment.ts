import { Stmt } from "../comp/ast";
import { BooleanVal, MK_BOOL, MK_NATIVE_FN, MK_NULL, MK_NUMBER, NumberVal, RuntimeVal, StringVal } from "./values";


export default class Environment {
    private parent?: Environment;
    private variables: Map<string, RuntimeVal>;
    private constants: Set<string>;
    public isContinueSet:boolean = false;
    public isBreakSet:boolean = false; 
    public returnVal?:RuntimeVal = undefined; 
    public scopeOwner: Stmt|RuntimeVal;

    constructor(parentENV?: Environment, scopeOwner: Stmt|RuntimeVal|undefined = undefined) {
        this.parent = parentENV;
        this.variables = new Map();
        this.constants = new Set();
        this.scopeOwner = scopeOwner;
    }

    public declareVar(
        varname: string,
        value: RuntimeVal,
        constant: boolean,
    ): RuntimeVal {
        if (this.variables.has(varname)) {
            throw `Cannot declare variable ${varname}. As it already is defined.`;
        }

        this.variables.set(varname, value);
        if (constant) {
            this.constants.add(varname);
        }
        return value;
    }

    public assignVar(varname: string, value: RuntimeVal): RuntimeVal {
        const env = this.resolve(varname);

        // Cannot assign to constant
        if (env.constants.has(varname)) {
            throw `Cannot reassign to variable ${varname} as it was declared constant.`;
        }

        env.variables.set(varname, value);
        return value;
    }

    public lookupVar(varname: string): RuntimeVal {
        const env = this.resolve(varname);
        return env.variables.get(varname) as RuntimeVal;
    }

    public resolve(varname: string): Environment {
        if (this.variables.has(varname)) {
            return this;
        }

        if (this.parent == undefined) {
            throw `Cannot resolve '${varname}' as it does not exist.`;
        }

        return this.parent.resolve(varname);
    }
}