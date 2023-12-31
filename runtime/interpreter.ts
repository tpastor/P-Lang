import { MK_STRING, NumberVal, RuntimeVal } from "./values";
import {
    AggregatedExpr,
    ArrayDeclaration,
    AssignmentExpr,
    BinaryExpr,
    CallExpr,
    ContinueBreak,
    EvaluatedExpr,
    ForExpr,
    FunctionDeclaration,
    Identifier,
    IfExpr,
    MemberExpr,
    NumericLiteral,
    ObjectLiteral,
    Program,
    Return,
    Stmt,
    StringLiteral,
    UnaryExpr,
    VarDeclaration,
    WhileExpr,
} from "../comp/ast";
import Environment from "./environment";
import { eval_aggr_expr, eval_array_declaration, eval_function_declaration, eval_program, eval_var_declaration } from "./eval/statements";
import { eval_assignment, eval_binary_expr, eval_break_continue, eval_call_expr, eval_for_expr, eval_identifier, eval_if_expr, eval_member_expr, eval_object_expr, eval_return, eval_unary_expr, eval_while_expr } from "./eval/expressions";

export function evaluate(astNode: Stmt, env: Environment): RuntimeVal {
    switch (astNode.kind) {
        case "NumericLiteral":
            return {
                value: ((astNode as NumericLiteral).value),
                type: "number",
            } as NumberVal;
        case "StringLiteral":
            return MK_STRING(((astNode as StringLiteral).value));
        case "Identifier":
            return eval_identifier(astNode as Identifier, env);
        case "ObjectLiteral":
            return eval_object_expr(astNode as ObjectLiteral, env);
        case "IfExpr":
            return eval_if_expr(astNode as IfExpr, env);            
        case "WhileExpr":
            return eval_while_expr(astNode as WhileExpr, env);                    
        case "ForExpr":
            return eval_for_expr(astNode as ForExpr, env);                        
        case "MemberExpr":
            return eval_member_expr(astNode as MemberExpr, env);                        
        case "CallExpr":
            return eval_call_expr(astNode as CallExpr, env);            
        case "AssignmentExpr":
            return eval_assignment(astNode as AssignmentExpr, env);
        case "UnaryExpr":
            return eval_unary_expr(astNode as UnaryExpr, env);
        case "BinaryExpr":
            return eval_binary_expr(astNode as BinaryExpr, env);
        case "Program":
            return eval_program(astNode as Program, env);
        // Handle statements
        case "FunctionDeclaration":
            return eval_function_declaration(astNode as FunctionDeclaration, env);
        case "VarDeclaration":
            return eval_var_declaration(astNode as VarDeclaration, env);
        case "ArrayDeclaration":
            return eval_array_declaration(astNode as ArrayDeclaration, env);
        case "Return":
            return eval_return(astNode as Return, env);    
        case "ContinueBreak":
            return eval_break_continue(astNode as ContinueBreak, env);  
        case "AggregatedExpr":
            return eval_aggr_expr(astNode as AggregatedExpr, env);  
        // this is the gate of hell
        case "EvaluatedExpr":
            return (astNode as EvaluatedExpr).evaluatedVal;           
        default:
            console.error(
                "This AST Node has not yet been setup for interpretation.",
                astNode,
            );
            process.exit(0);
    }
}
