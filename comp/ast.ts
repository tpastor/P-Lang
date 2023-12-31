import { RuntimeVal } from "../runtime/values";
import { Token } from "./lexer";

export type NodeType =
  | "Program"
  | "VarDeclaration"
  | "ArrayDeclaration"
  | "FunctionDeclaration"

  | "AssignmentExpr"
  | "MemberExpr"
  | "CallExpr"
  | "IfExpr"
  | "WhileExpr"
  | "ForExpr"
  | "ForeachExpr"
  | "EvaluatedExpr"
  | "AggregatedExpr"

  | "Property"
  | "ContinueBreak"
  | "Return"  
  | "ObjectLiteral"
  | "NumericLiteral"
  | "StringLiteral"
  | "NativeBlock"
  | "Identifier"
  | "UnaryExpr"
  | "NegationExpr"
  | "BinaryExpr"
  | "Import"
  | "NOOP";

export interface Stmt {
  kind: NodeType;
  tokenForDebug?: Token
}

export interface Program extends Stmt {
  kind: "Program";
  body: Stmt[];
}

export interface NOOP extends Stmt {
  kind: "NOOP";
}

export interface Import extends Stmt {
  kind: "Import";
  fileName: string,
  namespace?: string,
}

export interface VarDeclaration extends Stmt {
  kind: "VarDeclaration";
  constant: boolean,
  identifier: string[],
  isArray: boolean,
  value?: Expr[],
  isExport: boolean,
}

export interface AggregatedExpr extends Stmt {
  kind: "AggregatedExpr";
  stmts: Stmt[];
}

export interface FunctionDeclaration extends Stmt {
  kind: "FunctionDeclaration";
  parameters: string[],
  name: string,
  body: Stmt[],
  isNative: boolean
}


/**  Expressions will result in a value at runtime unlike Statements */
export interface Expr extends Stmt { }

export interface AssignmentExpr extends Expr {
  kind: "AssignmentExpr";
  assignee: Expr,
  value: Expr,

}

export interface BinaryExpr extends Expr {
  kind: "BinaryExpr";
  left: Expr;
  right: Expr;
  operator: string; // needs to be of type BinaryOperator
}

export interface CallExpr extends Expr {
  kind: "CallExpr";
  args: Expr[];
  callName: Expr;
}


export interface EvaluatedExpr extends Expr {
  kind: "EvaluatedExpr";
  evaluatedVal: RuntimeVal
}

export interface IfExpr extends Expr {
  kind: "IfExpr";
  condition: Expr;
  body: Stmt[];
  elseBody?: Stmt[];
}

export interface WhileExpr extends Expr {
  kind: "WhileExpr";
  condition: Expr;
  body: Stmt[];
}

export interface ForExpr extends Expr {
  kind: "ForExpr";
  var: Expr;
  condition: Expr;
  increment: Expr;
  body: Stmt[];
}

export interface ForeachExpr extends Expr {
  kind: "ForeachExpr";
  var: Expr;
  iterable: Identifier;
  body: Stmt[];
}

export interface MemberExpr extends Expr {
  kind: "MemberExpr";
  object: Expr;
  property: Expr;
  computed: boolean;
}

export interface NativeBlock extends Expr {
  kind: "NativeBlock";
  parameters: Identifier[]
  sourceCode: string
}

export interface BinaryExpr extends Expr {
  kind: "BinaryExpr";
  left: Expr;
  right: Expr;
  operator: string; 
}

export interface UnaryExpr extends Expr {
  kind: "UnaryExpr";
  left: Expr;
  operator: string; 
}
    

export interface Identifier extends Expr {
  kind: "Identifier";
  symbol: string;
}

export interface NumericLiteral extends Expr {
  kind: "NumericLiteral";
  value: number;
}

export interface StringLiteral extends Expr {
  kind: "StringLiteral";
  value: string;
}

export interface Property extends Expr {
  kind: "Property";
  key: string,
  value?: Expr,
}

export interface ObjectLiteral extends Expr {
  kind: "ObjectLiteral";
  properties: Property[];
}

//cant be initialized during creation for now
export interface ArrayDeclaration extends Expr {
  kind: "ArrayDeclaration";
  items: Expr[]
}

export interface ContinueBreak extends Expr {
  kind: "ContinueBreak";
  isContinue: boolean
}

export interface Return extends Expr {
  kind: "Return";
  returnVal: Expr[] 
}
