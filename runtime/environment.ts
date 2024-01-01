import { Stmt } from "../comp/ast";
import { RuntimeVal } from "./values";


export default class Environment {
    private parent?: Environment;
    private variables: Map<string, RuntimeVal>;
    private constants: Set<string>;
    public isContinueSet:boolean = false;
    public isBreakSet: boolean = false; 
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

        if (!value) {
            throw `Value null cannot be assigned to any Variable ${varname}.`;
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

    public getVariablesInLocalScope(): string[] {
        return [...this.variables.keys()]
    }

    public lookupVar(varname: string): RuntimeVal {
        const env = this.resolve(varname);
        return env.variables.get(varname) as RuntimeVal;
    }

    public checkVarExists(varname: string, onlyLocal:boolean): boolean {
        return this.check(varname, onlyLocal) != null;
        
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

    public check(varname: string, onlyLocal:boolean): Environment {
        if (this.variables.has(varname)) {
            return this;
        }

        if (onlyLocal || this.parent == undefined) {
            return null;
        }

        return this.parent.check(varname, onlyLocal);
    }
}