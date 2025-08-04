import type {Node} from "web-tree-sitter"
import type {Ctx} from "./ctx"
import {formatLeading, printNode} from "./node"
import type {Doc} from "../doc"
import {ifBreak} from "../doc"
import {breakParent, lineSuffix} from "../doc"
import {
    blank,
    blankLinesBetween,
    concat,
    empty,
    group,
    hardLine,
    indent,
    line,
    softLine,
    text,
} from "../doc"
import {takeLeading, takeTrailing} from "../comments"

export function printDotAccess(node: Node, ctx: Ctx): Doc | undefined {
    const qualifierN = node.childForFieldName("obj")
    const fieldN = node.childForFieldName("field")

    if (!qualifierN || !fieldN) return undefined

    const qualifier = printNode(qualifierN, ctx) ?? empty()
    const field = text(fieldN.text)

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text), breakParent()]),
    )
    const leadingField = takeLeading(fieldN, ctx.comments)
    const leadingFieldDoc = formatLeading(leadingField)

    if (qualifierN.type === "object_literal" && leadingFieldDoc.length === 0) {
        // don't add extra newline
        // Foo {
        //     ...
        // }.toCell()
        //  ^ here
        return group([qualifier, text("."), field, ...trailing])
    }

    return group([
        qualifier,
        indent(concat([softLine(), ...leadingFieldDoc, text("."), field, ...trailing])),
    ])
}

export function printFunctionCall(node: Node, ctx: Ctx): Doc | undefined {
    const calleeN = node.childForFieldName("callee")
    const argumentsN = node.childForFieldName("arguments")

    if (!calleeN || !argumentsN) return undefined

    const callee = printNode(calleeN, ctx) ?? empty()
    const args = printNode(argumentsN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text), breakParent()]),
    )

    return concat([callee, args, ...trailing])
}

export function printBinaryExpression(node: Node, ctx: Ctx): Doc | undefined {
    const leftN = node.child(0)
    const operatorN = node.childForFieldName("operator_name")
    const rightN = node.child(node.childCount - 1)

    if (!leftN || !operatorN || !rightN) return undefined

    const left = printNode(leftN, ctx) ?? empty()
    const right = printNode(rightN, ctx) ?? empty()
    const operator = operatorN.text

    const leading = takeLeading(node, ctx.comments)
    const leadingDoc = formatLeading(leading)

    const trailingForLeft = takeTrailing(leftN, ctx.comments).map(c =>
        concat([text(" "), lineSuffix(text(c.text)), breakParent()]),
    )
    const trailing =
        node.parent?.type === "binary_operator"
            ? []
            : takeTrailing(node, ctx.comments).map(c =>
                  concat([text(" "), lineSuffix(text(c.text))]),
              )

    return group([
        ...leadingDoc,
        left,
        text(" " + operator),
        ...trailingForLeft,
        line(),
        group([right]),
        ...trailing,
    ])
}

export function printIdentifier(node: Node, ctx: Ctx): Doc | undefined {
    return printTextCommon(node, ctx)
}

export const printNumberLiteral = (node: Node, ctx: Ctx): Doc | undefined => {
    return printTextCommon(node, ctx)
}

export function printStringLiteral(node: Node, ctx: Ctx): Doc | undefined {
    return printTextCommon(node, ctx)
}

export function printBooleanLiteral(node: Node, ctx: Ctx): Doc | undefined {
    return printTextCommon(node, ctx)
}

export function printNullLiteral(node: Node, ctx: Ctx): Doc | undefined {
    return printTextCommon(node, ctx)
}

export function printUnderscore(node: Node, ctx: Ctx): Doc | undefined {
    return printTextCommon(node, ctx)
}

function printTextCommon(node: Node, ctx: Ctx): Doc {
    const leading = takeLeading(node, ctx.comments)
    const leadingDoc = formatLeading(leading)

    return concat([...leadingDoc, text(node.text)])
}

export function printUnaryOperator(node: Node, ctx: Ctx): Doc | undefined {
    const operatorN = node.childForFieldName("operator_name")
    const argumentN = node.childForFieldName("argument")

    if (!operatorN || !argumentN) return undefined

    const operator = operatorN.text
    const argument = printNode(argumentN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([text(operator), argument, ...trailing])
}

export function printParenthesizedExpression(node: Node, ctx: Ctx): Doc | undefined {
    const innerN = node.childForFieldName("inner")
    if (!innerN) return undefined

    const inner = printNode(innerN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([text("("), inner, text(")"), ...trailing])
}

export function printTensorExpression(node: Node, ctx: Ctx): Doc | undefined {
    const expressions = node.namedChildren
        .filter(child => child?.type !== "," && child?.type !== "(" && child?.type !== ")")
        .filter(child => child !== null)

    if (expressions.length === 0) {
        return text("()")
    }

    const parts = expressions.map(expr => printNode(expr, ctx) ?? empty())
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    if (parts.length === 1) {
        return concat([text("("), parts[0], text(")"), ...trailing])
    }

    const [first, ...rest] = parts
    const tailDocs = rest.map(part => concat([text(","), line(), part]))

    return group([
        text("("),
        indent(concat([softLine(), first, ...tailDocs])),
        softLine(),
        text(")"),
        ...trailing,
    ])
}

export function printTypedTuple(node: Node, ctx: Ctx): Doc | undefined {
    const expressions = node.namedChildren
        .filter(child => child?.type !== "," && child?.type !== "[" && child?.type !== "]")
        .filter(child => child !== null)

    if (expressions.length === 0) {
        return text("[]")
    }

    const parts = expressions.map(expr => printNode(expr, ctx) ?? empty())
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    if (parts.length === 1) {
        return concat([text("["), parts[0], text("]"), ...trailing])
    }

    const [first, ...rest] = parts
    const tailDocs = rest.map(part => concat([text(","), line(), part]))

    return group([
        text("["),
        indent(concat([softLine(), first, ...tailDocs])),
        softLine(),
        text("]"),
        ...trailing,
    ])
}

export function printCastAsOperator(node: Node, ctx: Ctx): Doc | undefined {
    const exprN = node.childForFieldName("expr")
    const castedToN = node.childForFieldName("casted_to")

    if (!exprN || !castedToN) return undefined

    const expr = printNode(exprN, ctx) ?? empty()
    const castedTo = printNode(castedToN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([expr, text(" as "), castedTo, ...trailing])
}

export function printIsTypeOperator(node: Node, ctx: Ctx): Doc | undefined {
    const exprN = node.childForFieldName("expr")
    const operatorN = node.childForFieldName("operator")
    const rhsTypeN = node.childForFieldName("rhs_type")

    if (!exprN || !operatorN || !rhsTypeN) return undefined

    const expr = printNode(exprN, ctx) ?? empty()
    const operator = operatorN.text
    const rhsType = printNode(rhsTypeN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([expr, text(" "), text(operator), text(" "), rhsType, ...trailing])
}

export function printNotNullOperator(node: Node, ctx: Ctx): Doc | undefined {
    const innerN = node.childForFieldName("inner")
    if (!innerN) return undefined

    const inner = printNode(innerN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([inner, text("!"), ...trailing])
}

export function printLazyExpression(node: Node, ctx: Ctx): Doc | undefined {
    const argumentN = node.childForFieldName("argument")
    if (!argumentN) return undefined

    const argument = printNode(argumentN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([text("lazy "), argument, ...trailing])
}

export function printTernaryOperator(node: Node, ctx: Ctx): Doc | undefined {
    const conditionN = node.childForFieldName("condition")
    const consequenceN = node.childForFieldName("consequence")
    const alternativeN = node.childForFieldName("alternative")

    if (!conditionN || !consequenceN || !alternativeN) return undefined

    const condition = printNode(conditionN, ctx) ?? empty()
    const consequence = printNode(consequenceN, ctx) ?? empty()
    const alternative = printNode(alternativeN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return group([
        condition,
        indent(
            concat([
                softLine(),
                text(" ? "),
                consequence,
                softLine(),
                text(" : "),
                alternative,
                ...trailing,
            ]),
        ),
    ])
}

export function printArgumentList(node: Node, ctx: Ctx): Doc | undefined {
    const args = node.namedChildren
        .filter(child => child?.type === "call_argument")
        .filter(child => child !== null)

    if (args.length === 0) {
        return text("()")
    }

    const parts = args.map(arg => printNode(arg, ctx) ?? empty())
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    if (parts.length === 1) {
        return concat([text("("), parts[0], text(")"), ...trailing])
    }

    const [first, ...rest] = parts
    const tailDocs = rest.map(part => concat([text(","), line(), part]))

    return group([
        text("("),
        indent(concat([softLine(), first, ...tailDocs])),
        softLine(),
        text(")"),
        ...trailing,
    ])
}

export function printCallArgument(node: Node, ctx: Ctx): Doc | undefined {
    const exprN = node.childForFieldName("expr")
    if (!exprN) return undefined

    const expr = printNode(exprN, ctx) ?? empty()
    const leading = takeLeading(node, ctx.comments)
    const leadingDoc = formatLeading(leading)
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    // Check if there's a "mutate" keyword
    const mutateNode = node.children.find(child => child?.text === "mutate")
    if (mutateNode) {
        return concat([text("mutate "), expr, ...trailing])
    }

    return concat([...leadingDoc, expr, ...trailing])
}

export function printObjectLiteral(node: Node, ctx: Ctx): Doc | undefined {
    const typeN = node.childForFieldName("type")
    const argumentsN = node.childForFieldName("arguments")

    if (!argumentsN) return undefined

    const type = typeN ? concat([printNode(typeN, ctx) ?? empty(), text(" ")]) : empty()
    const args = printNode(argumentsN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([type, args, ...trailing])
}

export function printObjectLiteralBody(node: Node, ctx: Ctx): Doc | undefined {
    const args = node.namedChildren
        .filter(child => child?.type === "instance_argument")
        .filter(child => child !== null)

    if (args.length === 1) {
        // Check if this is actually an empty object
        const [singleArg] = args

        // If the argument is empty or just whitespace, treat as empty object
        if (singleArg.text.trim() === "") {
            return text("{}")
        }
    }

    if (args.length === 0) {
        return text("{}")
    }

    const parts = []
    for (const [index, arg] of args.entries()) {
        parts.push(printInstanceArgument(arg, ctx, index === args.length - 1) ?? empty())
    }
    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text), breakParent()]),
    )

    const [first, ...rest] = parts

    if (parts.length <= 2) {
        const tailDocs = rest.flatMap(part => [line(), part])
        return group([
            text("{"),
            indent(concat([line(), first, ...tailDocs])),
            line(),
            text("}"),
            ...trailing,
        ])
    }

    const tailDocs = rest.map(part => concat([hardLine(), part]))
    return group([
        text("{"),
        indent(concat([hardLine(), first, ...tailDocs])),
        hardLine(),
        text("}"),
        ...trailing,
    ])
}

export function printInstanceArgument(
    node: Node,
    ctx: Ctx,
    isLast: boolean = false,
): Doc | undefined {
    const nameN = node.childForFieldName("name")
    const valueN = node.childForFieldName("value")

    if (!nameN) return undefined

    const name = printNode(nameN, ctx) ?? empty()
    const leading = takeLeading(node, ctx.comments)
    const leadingDoc = formatLeading(leading)

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), text(c.text), breakParent()]),
    )

    const comma = ifBreak(text(","), isLast ? undefined : text(","))
    // Check if there's a colon in the node
    const hasColon = node.children.some(child => child?.text === ":")

    if (hasColon) {
        if (valueN) {
            if (valueN.type === "identifier" && nameN.text === valueN.text) {
                // format `{ foo: foo }` as `{ foo }`
                return concat([...leadingDoc, name, comma, ...trailing])
            }
            const value = printNode(valueN, ctx) ?? empty()
            return concat([...leadingDoc, name, text(": "), value, comma, ...trailing])
        } else {
            // case like {foo:}
            return concat([...leadingDoc, name, text(":"), comma, ...trailing])
        }
    } else {
        // case like {foo} without colon
        return concat([...leadingDoc, name, comma, ...trailing])
    }
}

export function printTypeInstantiatedTs(node: Node, ctx: Ctx): Doc | undefined {
    const nameN = node.childForFieldName("name")
    const argumentsN = node.childForFieldName("arguments")

    if (!nameN || !argumentsN) return undefined

    const name = printNode(nameN, ctx) ?? empty()
    const args = printNode(argumentsN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([name, args, ...trailing])
}

export function printGenericInstantiation(node: Node, ctx: Ctx): Doc | undefined {
    const exprN = node.childForFieldName("expr")
    const instantiationTsN = node.childForFieldName("instantiationTs")

    if (!exprN || !instantiationTsN) return undefined

    const expr = printNode(exprN, ctx) ?? empty()
    const instantiationTs = printNode(instantiationTsN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([expr, instantiationTs, ...trailing])
}

export function printInstantiationTList(node: Node, ctx: Ctx): Doc | undefined {
    const typesN = node
        .childrenForFieldName("types")
        .filter(it => it !== null)
        .filter(child => child.type !== "," && child.type !== "<" && child.type !== ">")

    const parts = typesN.map(type => printNode(type, ctx) ?? empty())
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    if (parts.length === 1) {
        return concat([text("<"), parts[0], text(">"), ...trailing])
    }

    const [first, ...rest] = parts
    const tailDocs = rest.map(part => concat([text(", "), part]))

    return group([text("<"), first, ...tailDocs, text(">"), ...trailing])
}

export function printMatchExpression(node: Node, ctx: Ctx): Doc | undefined {
    const exprN = node.childForFieldName("expr")
    const bodyN = node.childForFieldName("body")

    if (!exprN) return undefined

    const expr = printNode(exprN, ctx) ?? empty()
    const body = bodyN ? (printNode(bodyN, ctx) ?? empty()) : text("{}")

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([text("match ("), expr, text(") "), body, ...trailing])
}

export function printMatchBody(node: Node, ctx: Ctx): Doc | undefined {
    const arms = node.namedChildren
        .filter(child => child?.type === "match_arm")
        .filter(child => child !== null)

    if (arms.length === 0) {
        return text("{}")
    }

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    const tailDocs: Doc[] = []
    for (let i = 0; i < arms.length; i++) {
        const arm = arms[i]

        const leading = takeLeading(arm, ctx.comments).map(c => concat([text(c.text), hardLine()]))

        const doc = concat([...leading, printNode(arm, ctx) ?? empty()])
        tailDocs.push(doc)

        if (i < arms.length - 1) {
            tailDocs.push(blank(blankLinesBetween(arm, arms[i + 1], ctx.comments)))
        }
    }

    return concat([
        text("{"),
        indent(concat([hardLine(), ...tailDocs])),
        hardLine(),
        text("}"),
        ...trailing,
    ])
}

export function printMatchArm(node: Node, ctx: Ctx): Doc | undefined {
    const patternTypeN = node.childForFieldName("pattern_type")
    const patternExprN = node.childForFieldName("pattern_expr")
    const patternElseN = node.childForFieldName("pattern_else")
    const bodyBlockN = node.childForFieldName("block")
    const bodyN =
        bodyBlockN ??
        node.childForFieldName("return") ??
        node.childForFieldName("throw") ??
        node.childForFieldName("expr")

    if (!bodyN) return undefined

    const body = printNode(bodyN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    let pattern = empty()
    if (patternTypeN) {
        pattern = printNode(patternTypeN, ctx) ?? empty()
    } else if (patternExprN) {
        pattern = printNode(patternExprN, ctx) ?? empty()
    } else if (patternElseN) {
        pattern = text("else")
    }

    return concat([
        pattern,
        text(" => "),
        body,
        bodyN.id === bodyBlockN?.id ? empty() : text(","), // add `,` after arm only for non-blocks
        ...trailing,
    ])
}

export function printNumericIndex(node: Node, ctx: Ctx): Doc | undefined {
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([text(node.text), ...trailing])
}
