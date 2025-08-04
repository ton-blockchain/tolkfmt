import type {Node} from "web-tree-sitter"
import type {Ctx} from "./ctx"
import {formatDangling, printNode, hasFmtIgnoreDirective, printOriginalNodeText} from "./node"
import type {Doc} from "../doc"
import {
    blank,
    blankLinesBetween,
    breakParent,
    concat,
    empty,
    group,
    hardLine,
    indent,
    lineSuffix,
    softLine,
    text,
} from "../doc"
import {getLeading, takeDangling, takeLeading, takeTrailing} from "../comments"
import {printMatchExpression} from "./expr"

export const printIfStatement = (node: Node, ctx: Ctx): Doc | undefined => {
    const conditionN = node.childForFieldName("condition")
    const bodyN = node.childForFieldName("body")

    if (!conditionN || !bodyN) return undefined

    const condition = printNode(conditionN, ctx) ?? empty()
    const body = printNode(bodyN, ctx) ?? empty()

    const alternativeN = node.childForFieldName("alternative")
    const alternative = alternativeN
        ? [text(" else "), printNode(alternativeN, ctx) ?? empty()]
        : []

    return group([
        group([text("if ("), indent(concat([softLine(), condition])), softLine(), text(") ")]),
        body,
        ...alternative,
    ])
}

export function printSetAssignment(node: Node, ctx: Ctx): Doc | undefined {
    const leftN = node.childForFieldName("left")
    const rightN = node.childForFieldName("right")
    const operatorN = node.childForFieldName("operator_name")

    if (!leftN || !rightN || !operatorN) return undefined

    const left = printNode(leftN, ctx) ?? empty()
    const right = printNode(rightN, ctx) ?? empty()
    const operator = operatorN.text

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return group([left, text(" "), text(operator), text(" "), right, ...trailing])
}

export function printBlockStatement(node: Node, ctx: Ctx): Doc | undefined {
    const statements = node.namedChildren
        .filter(it => it !== null)
        .filter(it => it.type !== "comment")

    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))
    const dangling = takeDangling(node, ctx.comments)
    const danglingDoc = formatDangling(dangling)

    if (statements.length === 0 && leading.length === 0 && dangling.length === 0) {
        return text("{}")
    }

    const docs: Doc[] = []
    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i]

        if (hasFmtIgnoreDirective(getLeading(statement, ctx.comments))) {
            docs.push(printOriginalNodeText(statement, ctx))
        } else {
            const stmtLeading = takeLeading(statement, ctx.comments)
            const leadingDoc = stmtLeading.map(c => concat([text(c.text), hardLine()]))
            const doc = concat([...leadingDoc, printNode(statement, ctx) ?? empty()])
            docs.push(doc)
        }

        if (i < statements.length - 1) {
            docs.push(blank(blankLinesBetween(statement, statements[i + 1], ctx.comments)))
        }
    }

    return concat([
        text("{"),
        indent(concat([hardLine(), ...leading, ...docs, ...danglingDoc])),
        hardLine(),
        text("}"),
    ])
}

export function printExpressionStatement(node: Node, ctx: Ctx): Doc | undefined {
    const expr = node.firstChild
    if (!expr) return undefined

    const trailing = takeTrailing(node, ctx.comments).map(c =>
        concat([text(" "), lineSuffix(text(c.text)), breakParent()]),
    )

    return concat([printNode(expr, ctx) ?? empty(), text(";"), ...trailing])
}

export function printReturnStatement(node: Node, ctx: Ctx): Doc | undefined {
    const exprN = node.childForFieldName("body")

    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    if (exprN) {
        const expr = printNode(exprN, ctx) ?? empty()
        return concat([...leading, text("return "), expr, text(";"), ...trailing])
    } else {
        return concat([...leading, text("return;"), ...trailing])
    }
}

export function printBreakStatement(node: Node, ctx: Ctx): Doc | undefined {
    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([...leading, text("break"), ...trailing])
}

export function printContinueStatement(node: Node, ctx: Ctx): Doc | undefined {
    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([...leading, text("continue"), ...trailing])
}

export function printThrowStatement(node: Node, ctx: Ctx): Doc | undefined {
    const exprN = node.firstNamedChild // The expression to throw

    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    if (exprN) {
        const expr = printNode(exprN, ctx) ?? empty()
        return concat([...leading, text("throw "), expr, ...trailing])
    } else {
        return concat([...leading, text("throw"), ...trailing])
    }
}

export function printWhileStatement(node: Node, ctx: Ctx): Doc | undefined {
    const conditionN = node.childForFieldName("condition")
    const bodyN = node.childForFieldName("body")

    if (!conditionN || !bodyN) return undefined

    const condition = printNode(conditionN, ctx) ?? empty()
    const body = printNode(bodyN, ctx) ?? empty()

    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))

    return concat([
        ...leading,
        group([text("while ("), indent(concat([softLine(), condition])), softLine(), text(") ")]),
        body,
    ])
}

export function printDoWhileStatement(node: Node, ctx: Ctx): Doc | undefined {
    const conditionN = node.childForFieldName("condition")
    const bodyN = node.childForFieldName("body")

    if (!conditionN || !bodyN) return undefined

    const condition = printNode(conditionN, ctx) ?? empty()
    const body = printNode(bodyN, ctx) ?? empty()

    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))

    return concat([
        ...leading,
        text("do "),
        body,
        group([text(" while ("), indent(concat([softLine(), condition])), softLine(), text(");")]),
    ])
}

export function printRepeatStatement(node: Node, ctx: Ctx): Doc | undefined {
    const countN = node.childForFieldName("count")
    const bodyN = node.childForFieldName("body")

    if (!countN || !bodyN) return undefined

    const count = printNode(countN, ctx) ?? empty()
    const body = printNode(bodyN, ctx) ?? empty()

    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))

    return concat([
        ...leading,
        group([text("repeat ("), indent(concat([softLine(), count])), softLine(), text(") ")]),
        body,
    ])
}

export function printLocalVarsDeclaration(node: Node, ctx: Ctx): Doc | undefined {
    const kindN = node.childForFieldName("kind")
    const lhsN = node.childForFieldName("lhs")
    const assignedValN = node.childForFieldName("assigned_val")

    if (!kindN || !lhsN) return undefined

    const isMatchExpression = node.parent?.type === "match_expression"

    const kind = kindN.text // "var" or "val"
    const lhs = printNode(lhsN, ctx) ?? empty()

    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    if (assignedValN) {
        const assignedVal = printNode(assignedValN, ctx) ?? empty()
        return concat([
            ...leading,
            text(kind),
            text(" "),
            lhs,
            text(" = "),
            assignedVal,
            isMatchExpression ? empty() : text(";"),
            ...trailing,
        ])
    } else {
        return concat([...leading, text(kind), text(" "), lhs, text(";"), ...trailing])
    }
}

export function printVarDeclaration(node: Node, ctx: Ctx): Doc | undefined {
    const nameN = node.childForFieldName("name")
    const typeN = node.childForFieldName("type")
    const redefN = node.childForFieldName("redef")

    if (!nameN) return undefined

    const name = printNode(nameN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    if (redefN) {
        return concat([name, text(" redef"), ...trailing])
    } else if (typeN) {
        const type = printNode(typeN, ctx) ?? empty()
        return concat([name, text(": "), type, ...trailing])
    } else {
        return concat([name, ...trailing])
    }
}

export function printTupleVarsDeclaration(node: Node, ctx: Ctx): Doc | undefined {
    const varsN = node.childrenForFieldName("vars")

    // Extract all vars from the vars field
    const vars = varsN.filter(child => child !== null).filter(child => child.isNamed)
    const parts = vars.map(v => printNode(v, ctx) ?? empty())

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    if (parts.length === 1) {
        return concat([text("["), parts[0], text("]"), ...trailing])
    }

    const [first, ...rest] = parts
    const tailDocs = rest.map(part => concat([text(", "), part]))

    return group([
        text("["),
        indent(concat([softLine(), first, ...tailDocs])),
        softLine(),
        text("]"),
        ...trailing,
    ])
}

export function printTensorVarsDeclaration(node: Node, ctx: Ctx): Doc | undefined {
    const varsN = node.childrenForFieldName("vars")

    // Extract all vars from the vars field
    const vars = varsN.filter(child => child !== null).filter(child => child.isNamed)
    const parts = vars.map(v => printNode(v, ctx) ?? empty())

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    if (parts.length === 1) {
        return concat([text("("), parts[0], text(")"), ...trailing])
    }

    const [first, ...rest] = parts
    const tailDocs = rest.map(part => concat([text(", "), part]))

    return group([
        text("("),
        indent(concat([softLine(), first, ...tailDocs])),
        softLine(),
        text(")"),
        ...trailing,
    ])
}

export function printEmptyStatement(node: Node, ctx: Ctx): Doc | undefined {
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([text(";"), ...trailing])
}

export function printAssertStatement(node: Node, ctx: Ctx): Doc | undefined {
    const conditionN = node.childForFieldName("condition")
    const excNoN = node.childForFieldName("excNo")

    if (!conditionN || !excNoN) return undefined

    const condition = printNode(conditionN, ctx) ?? empty()
    const excNo = printNode(excNoN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    // Check if it's the throw form: assert(...) throw ...
    const hasThrow = node.children.some(child => child?.text === "throw")

    return hasThrow
        ? group([
              text("assert ("),
              indent(concat([softLine(), condition])),
              softLine(),
              text(") throw "),
              excNo,
              text(";"),
              ...trailing,
          ])
        : group([text("assert("), condition, text(", "), excNo, text(");"), ...trailing])
}

export function printTryCatchStatement(node: Node, ctx: Ctx): Doc | undefined {
    const tryBodyN = node.childForFieldName("try_body")
    const catchN = node.childForFieldName("catch")

    if (!tryBodyN || !catchN) return undefined

    const tryBody = printNode(tryBodyN, ctx) ?? empty()
    const catchClause = printNode(catchN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([text("try "), tryBody, text(" catch "), catchClause, ...trailing])
}

export function printCatchClause(node: Node, ctx: Ctx): Doc | undefined {
    const catchBodyN = node.childForFieldName("catch_body")
    const catchVar1N = node.childForFieldName("catch_var1")
    const catchVar2N = node.childForFieldName("catch_var2")

    if (!catchBodyN) return undefined

    const catchBody = printNode(catchBodyN, ctx) ?? empty()
    const catchVar1 = catchVar1N ? (printNode(catchVar1N, ctx) ?? empty()) : empty()
    const catchVar2 = catchVar2N ? (printNode(catchVar2N, ctx) ?? empty()) : empty()

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    let vars = empty()
    if (catchVar1.$ !== "Empty") {
        vars =
            catchVar2.$ === "Empty"
                ? concat([text("("), catchVar1, text(") ")])
                : concat([text("("), catchVar1, text(", "), catchVar2, text(") ")])
    }

    return concat([vars, catchBody, ...trailing])
}

export function printMatchStatement(node: Node, ctx: Ctx): Doc | undefined {
    const expr = node.firstChild
    if (!expr) return undefined
    return printMatchExpression(expr, ctx)
}

export function printAssignment(node: Node, ctx: Ctx): Doc | undefined {
    const leftN = node.childForFieldName("left")
    const rightN = node.childForFieldName("right")

    if (!leftN || !rightN) return undefined

    const left = printNode(leftN, ctx) ?? empty()
    const right = printNode(rightN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([left, text(" = "), right, ...trailing])
}
