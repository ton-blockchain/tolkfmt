import type {Node} from "web-tree-sitter"
import type {Ctx} from "./ctx"
import type {Doc} from "../doc"
import {concat, hardLine, text} from "../doc"
import * as stmts from "./stmts"
import * as decls from "./decls"
import * as expr from "./expr"
import * as types from "./types"
import type {CommentInfo} from "../comments"
import {takeTrailing, takeLeading} from "../comments"
import type {Range} from "../index"

export const printNode = (node: Node, ctx: Ctx): Doc | undefined => {
    if (ctx.range && !nodeIntersectsRange(node, ctx.range)) {
        if (node.type !== "source_file") {
            return printOriginalNodeText(node, ctx)
        }
    }

    if (node.type === "source_file") {
        return decls.printSourceFile(node, ctx)
    }

    if (node.type === "number_literal") {
        return expr.printNumberLiteral(node, ctx)
    }

    if (node.type === "string_literal") {
        return expr.printStringLiteral(node, ctx)
    }

    if (node.type === "boolean_literal") {
        return expr.printBooleanLiteral(node, ctx)
    }

    if (node.type === "null_literal") {
        return expr.printNullLiteral(node, ctx)
    }

    if (node.type === "underscore") {
        return expr.printUnderscore(node, ctx)
    }

    if (node.type === "identifier" || node.type === "type_identifier") {
        return expr.printIdentifier(node, ctx)
    }

    if (node.type === "type_alias_declaration") {
        return decls.printTypeAlias(node, ctx)
    }

    if (node.type === "constant_declaration") {
        return decls.printConstantDeclaration(node, ctx)
    }

    if (node.type === "function_declaration") {
        return decls.printFunction(node, ctx)
    }

    if (node.type === "union_type") {
        return types.printUnionType(node, ctx)
    }

    if (node.type === "nullable_type") {
        return types.printNullableType(node, ctx)
    }

    if (node.type === "parenthesized_type") {
        return types.printParenthesizedType(node, ctx)
    }

    if (node.type === "tensor_type") {
        return types.printTensorType(node, ctx)
    }

    if (node.type === "tuple_type") {
        return types.printTupleType(node, ctx)
    }

    if (node.type === "dot_access") {
        return expr.printDotAccess(node, ctx)
    }

    if (node.type === "function_call") {
        return expr.printFunctionCall(node, ctx)
    }

    if (node.type === "argument_list") {
        return expr.printArgumentList(node, ctx)
    }

    if (node.type === "call_argument") {
        return expr.printCallArgument(node, ctx)
    }

    if (node.type === "binary_operator") {
        return expr.printBinaryExpression(node, ctx)
    }

    if (node.type === "assignment") {
        return stmts.printAssignment(node, ctx)
    }

    if (node.type === "unary_operator") {
        return expr.printUnaryOperator(node, ctx)
    }

    if (node.type === "parenthesized_expression") {
        return expr.printParenthesizedExpression(node, ctx)
    }

    if (node.type === "tensor_expression") {
        return expr.printTensorExpression(node, ctx)
    }

    if (node.type === "typed_tuple") {
        return expr.printTypedTuple(node, ctx)
    }

    if (node.type === "cast_as_operator") {
        return expr.printCastAsOperator(node, ctx)
    }

    if (node.type === "is_type_operator") {
        return expr.printIsTypeOperator(node, ctx)
    }

    if (node.type === "not_null_operator") {
        return expr.printNotNullOperator(node, ctx)
    }

    if (node.type === "lazy_expression") {
        return expr.printLazyExpression(node, ctx)
    }

    if (node.type === "ternary_operator") {
        return expr.printTernaryOperator(node, ctx)
    }

    if (node.type === "object_literal") {
        return expr.printObjectLiteral(node, ctx)
    }

    if (node.type === "object_literal_body") {
        return expr.printObjectLiteralBody(node, ctx)
    }

    if (node.type === "instance_argument") {
        return expr.printInstanceArgument(node, ctx)
    }

    if (node.type === "if_statement") {
        return stmts.printIfStatement(node, ctx)
    }

    if (node.type === "block_statement") {
        return stmts.printBlockStatement(node, ctx)
    }

    if (node.type === "expression_statement") {
        return stmts.printExpressionStatement(node, ctx)
    }

    if (node.type === "return_statement") {
        return stmts.printReturnStatement(node, ctx)
    }

    if (node.type === "break_statement") {
        return stmts.printBreakStatement(node, ctx)
    }

    if (node.type === "continue_statement") {
        return stmts.printContinueStatement(node, ctx)
    }

    if (node.type === "throw_statement") {
        return stmts.printThrowStatement(node, ctx)
    }

    if (node.type === "while_statement") {
        return stmts.printWhileStatement(node, ctx)
    }

    if (node.type === "do_while_statement") {
        return stmts.printDoWhileStatement(node, ctx)
    }

    if (node.type === "repeat_statement") {
        return stmts.printRepeatStatement(node, ctx)
    }

    if (node.type === "local_vars_declaration") {
        return stmts.printLocalVarsDeclaration(node, ctx)
    }

    if (node.type === "var_declaration") {
        return stmts.printVarDeclaration(node, ctx)
    }

    if (node.type === "tuple_vars_declaration") {
        return stmts.printTupleVarsDeclaration(node, ctx)
    }

    if (node.type === "tensor_vars_declaration") {
        return stmts.printTensorVarsDeclaration(node, ctx)
    }

    if (node.type === "parameter_list") {
        return decls.printParameterList(node, ctx)
    }

    if (node.type === "parameter_declaration") {
        return decls.printParameterDeclaration(node, ctx)
    }

    if (node.type === "method_declaration") {
        return decls.printMethodDeclaration(node, ctx)
    }

    if (node.type === "get_method_declaration") {
        return decls.printGetMethodDeclaration(node, ctx)
    }

    // Top-level declarations
    if (node.type === "tolk_required_version") {
        return decls.printTolkRequiredVersion(node, ctx)
    }

    if (node.type === "version_value") {
        return decls.printVersionValue(node, ctx)
    }

    if (node.type === "import_directive") {
        return decls.printImportDirective(node, ctx)
    }

    if (node.type === "global_var_declaration") {
        return decls.printGlobalVarDeclaration(node, ctx)
    }

    if (node.type === "struct_declaration") {
        return decls.printStructDeclaration(node, ctx)
    }

    if (node.type === "struct_body") {
        return decls.printStructBody(node, ctx)
    }

    if (node.type === "struct_field_declaration") {
        return decls.printStructFieldDeclaration(node, ctx)
    }

    if (node.type === "empty_statement") {
        return stmts.printEmptyStatement(node, ctx)
    }

    if (node.type === "set_assignment") {
        return stmts.printSetAssignment(node, ctx)
    }

    if (node.type === "type_parameters") {
        return decls.printTypeParameters(node, ctx)
    }

    if (node.type === "type_parameter") {
        return decls.printTypeParameter(node, ctx)
    }

    if (node.type === "type_instantiatedTs") {
        return expr.printTypeInstantiatedTs(node, ctx)
    }

    if (node.type === "generic_instantiation") {
        return expr.printGenericInstantiation(node, ctx)
    }

    if (node.type === "instantiationT_list") {
        return expr.printInstantiationTList(node, ctx)
    }

    if (node.type === "asm_body") {
        return decls.printAsmBody(node, ctx)
    }

    if (node.type === "builtin_specifier") {
        return decls.printBuiltinSpecifier(node, ctx)
    }

    if (node.type === "method_receiver") {
        return decls.printMethodReceiver(node, ctx)
    }

    if (node.type === "annotation_list") {
        return decls.printAnnotationList(node, ctx)
    }

    if (node.type === "annotation") {
        return decls.printAnnotation(node, ctx)
    }

    if (node.type === "annotation_arguments") {
        return decls.printAnnotationArguments(node, ctx)
    }

    if (node.type === "fun_callable_type") {
        return types.printFunCallableType(node, ctx)
    }

    if (node.type === "assert_statement") {
        return stmts.printAssertStatement(node, ctx)
    }

    if (node.type === "try_catch_statement") {
        return stmts.printTryCatchStatement(node, ctx)
    }

    if (node.type === "catch_clause") {
        return stmts.printCatchClause(node, ctx)
    }

    if (node.type === "match_statement") {
        return stmts.printMatchStatement(node, ctx)
    }

    if (node.type === "match_expression") {
        return expr.printMatchExpression(node, ctx)
    }

    if (node.type === "match_body") {
        return expr.printMatchBody(node, ctx)
    }

    if (node.type === "match_arm") {
        return expr.printMatchArm(node, ctx)
    }

    if (node.type === "numeric_index") {
        return expr.printNumericIndex(node, ctx)
    }

    return undefined
}

export function formatLeading(leading: CommentInfo[]): Doc[] {
    if (leading.length === 1 && leading[0].text.startsWith("/*")) {
        return [text(leading[0].text)] // inline /* foo */
    }

    return leading.flatMap(c => [text(c.text), hardLine()])
}

export function formatDangling(dangling: CommentInfo[]): Doc[] {
    if (dangling.length === 0) {
        return []
    }

    if (dangling.length === 1) {
        return [text(dangling[0].text)]
    }

    const [first, ...rest] = dangling
    return [text(first.text), ...rest.flatMap(c => [hardLine(), text(c.text)])]
}

function nodeIntersectsRange(node: Node, range: Range): boolean {
    const nodeStart = node.startPosition
    const nodeEnd = node.endPosition

    if (
        nodeEnd.row < range.start.line ||
        (nodeEnd.row === range.start.line && nodeEnd.column < range.start.character)
    ) {
        return false
    }

    if (
        nodeStart.row > range.end.line ||
        (nodeStart.row === range.end.line && nodeStart.column > range.end.character)
    ) {
        return false
    }

    // intersects
    return true
}

export function getOriginalNodeText(node: Node): string {
    // semicolon is not a part of the following nodes, so we need to add it manually
    const needSemicolon =
        node.type === "local_vars_declaration" ||
        node.type === "return_statement" ||
        node.type === "do_while_statement" ||
        node.type === "break_statement" ||
        node.type === "continue_statement" ||
        node.type === "throw_statement" ||
        node.type === "assert_statement" ||
        node.type === "expression_statement"

    return node.text + (needSemicolon ? ";" : "")
}

export function printOriginalNodeText(node: Node, ctx: Ctx): Doc {
    const leading = takeLeading(node, ctx.comments)
    const trailing = takeTrailing(node, ctx.comments)
    const leadingDoc = leading.map(c => concat([text(c.text), hardLine()]))
    const trailingDoc = trailing.map(c => concat([text(" "), text(c.text)]))
    return concat([...leadingDoc, text(getOriginalNodeText(node)), ...trailingDoc])
}

export function isFmtIgnoreComment(comment: CommentInfo): boolean {
    return comment.text.trim() === "// fmt-ignore"
}

export function hasFmtIgnoreDirective(leadingComments: CommentInfo[]): boolean {
    return leadingComments.some(comment => isFmtIgnoreComment(comment))
}
