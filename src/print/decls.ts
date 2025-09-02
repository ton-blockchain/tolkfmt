import type {Node} from "web-tree-sitter"
import type {Doc} from "../doc"
import {breakParent} from "../doc"
import {
    blank,
    blankLinesBetween,
    concat,
    empty,
    group,
    hardLine,
    ifBreak,
    indent,
    line,
    softLine,
    text,
} from "../doc"
import {getLeading, takeLeading, takeTrailing} from "../comments"
import type {Ctx} from "./ctx"
import {formatLeading, hasFmtIgnoreDirective, printNode, printOriginalNodeText} from "./node"
import type {ImportInfo} from "./imports"
import {categorizeImport, extractImportPath, getImportSubcategory, sortImports} from "./imports"

export function printSourceFile(node: Node, ctx: Ctx): Doc | undefined {
    const decls = node.children.filter(it => it !== null).filter(it => it.type !== "comment")

    if (ctx.sortImports) {
        const imports: Node[] = []
        const nonImports: Node[] = []

        for (const decl of decls) {
            if (decl.type === "import_directive") {
                imports.push(decl)
            } else {
                nonImports.push(decl)
            }
        }

        const importInfos: ImportInfo[] = []
        for (const importNode of imports) {
            const path = extractImportPath(importNode)
            const category = categorizeImport(path)
            const subcategory = getImportSubcategory(path, category)

            importInfos.push({
                node: importNode,
                path,
                category,
                subcategory,
            })
        }

        const sortedImports = sortImports(importInfos)
        const sortedImportNodes = sortedImports.map(info => info.node)

        return concat([
            printImports(sortedImportNodes, nonImports, ctx),
            printDeclarations(nonImports, ctx),
        ])
    }

    return printDeclarations(decls, ctx)
}

function printImports(imports: Node[], nonImports: Node[], ctx: Ctx): Doc {
    const docs: Doc[] = []
    for (const importDecl of imports) {
        const leading = getLeading(importDecl, ctx.comments)

        if (hasFmtIgnoreDirective(leading)) {
            docs.push(printOriginalNodeText(importDecl, ctx))
        } else {
            const doc = concat([printNode(importDecl, ctx) ?? empty()])
            docs.push(doc)
        }

        docs.push(hardLine())
    }

    if (imports.length > 0 && nonImports.length > 0) {
        docs.push(hardLine())
    }

    return concat(docs)
}

function printDeclarations(decls: Node[], ctx: Ctx): Doc {
    const docs: Doc[] = []
    for (let i = 0; i < decls.length; i++) {
        const decl = decls[i]

        const leading = getLeading(decl, ctx.comments)

        if (hasFmtIgnoreDirective(leading)) {
            docs.push(printOriginalNodeText(decl, ctx))
        } else {
            const doc = concat([printNode(decl, ctx) ?? empty()])
            docs.push(doc)
        }

        if (i < decls.length - 1) {
            docs.push(blank(blankLinesBetween(decl, decls[i + 1], ctx.comments)))
        }

        if (i === decls.length - 1) {
            docs.push(hardLine())
        }
    }

    return concat(docs)
}

export function printVersionValue(node: Node, ctx: Ctx): Doc | undefined {
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([text(node.text), ...trailing])
}

export function printTypeAlias(node: Node, ctx: Ctx): Doc | undefined {
    const annotationsN = node.childForFieldName("annotations")
    const nameN = node.childForFieldName("name")
    const typeN = node.childForFieldName("underlying_type")
    const typeParametersN = node.childForFieldName("type_parameters")

    if (!nameN || !typeN) return undefined

    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    const annotations = annotationsN ? (printNode(annotationsN, ctx) ?? empty()) : empty()
    const name = text(nameN.text)
    const typeParameters = typeParametersN ? (printNode(typeParametersN, ctx) ?? empty()) : empty()
    const type = printNode(typeN, ctx) ?? empty()

    return concat([
        ...leading,
        annotations,
        text("type"),
        text(" "),
        name,
        typeParameters,
        group([
            text(" ="),
            typeN.type === "union_type" ? ifBreak(undefined, text(" ")) : text(" "),
            type,
        ]),
        ...trailing,
    ])
}

export function printFunction(node: Node, ctx: Ctx): Doc | undefined {
    const annotationsN = node.childForFieldName("annotations")
    const nameN = node.childForFieldName("name")
    const typeParametersN = node.childForFieldName("type_parameters")
    const parametersN = node.childForFieldName("parameters")
    const returnTypeN = node.childForFieldName("return_type")
    const specialBodyN =
        node.childForFieldName("asm_body") ?? node.childForFieldName("builtin_specifier")
    const bodyN = node.childForFieldName("body") ?? specialBodyN

    if (!nameN || !parametersN || !bodyN) return undefined

    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    const annotations = annotationsN ? (printNode(annotationsN, ctx) ?? empty()) : empty()
    const name = text(nameN.text)
    const typeParameters = typeParametersN ? (printNode(typeParametersN, ctx) ?? empty()) : empty()
    const parameters = printNode(parametersN, ctx) ?? empty()
    const body = printNode(bodyN, ctx) ?? empty()

    let returnTypePart = empty()
    if (returnTypeN) {
        const returnType = printNode(returnTypeN, ctx) ?? empty()
        returnTypePart = concat([text(": "), returnType])
    }

    const isSpecialBody = specialBodyN !== null

    return concat([
        ...leading,
        annotations,
        text("fun "),
        name,
        typeParameters,
        parameters,
        returnTypePart,
        ...(isSpecialBody ? [indent(concat([hardLine(), body]))] : [text(" "), body]),
        ...trailing,
    ])
}

export function printParameterList(node: Node, ctx: Ctx): Doc | undefined {
    const params = node.namedChildren
        .filter(child => child?.type === "parameter_declaration")
        .filter(child => child !== null)

    if (params.length === 0) {
        return text("()")
    }

    const parts = params.map(param => printNode(param, ctx) ?? empty())
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    if (parts.length === 1) {
        return concat([text("("), parts[0], text(")"), ...trailing])
    }

    const [first, ...rest] = parts
    const tailDocs = rest.map(part => concat([text(","), line(), part]))

    return group([
        text("("),
        indent(concat([softLine(), first, ...tailDocs])),
        ifBreak(text(","), undefined), // trailing comma
        softLine(),
        text(")"),
        ...trailing,
    ])
}

export function printParameterDeclaration(node: Node, ctx: Ctx): Doc | undefined {
    const mutateN = node.childForFieldName("mutate")
    const nameN = node.childForFieldName("name")
    const typeN = node.childForFieldName("type")
    const defaultN = node.childForFieldName("default")

    if (!nameN) return undefined

    const name = printNode(nameN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    let result = [name]

    if (mutateN) {
        result = [text("mutate "), ...result]
    }

    if (typeN) {
        const type = printNode(typeN, ctx) ?? empty()
        result = [...result, text(": "), type]
    }

    if (defaultN) {
        const defaultVal = printNode(defaultN, ctx) ?? empty()
        result = [...result, text(" = "), defaultVal]
    }

    return concat([...result, ...trailing])
}

export function printBuiltinSpecifier(node: Node, ctx: Ctx): Doc | undefined {
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([text("builtin"), ...trailing])
}

export function printConstantDeclaration(node: Node, ctx: Ctx): Doc | undefined {
    const annotationsN = node.childForFieldName("annotations")
    const nameN = node.childForFieldName("name")
    const valueN = node.childForFieldName("value")
    const typeN = node.childForFieldName("type")

    if (!nameN || !valueN) return undefined

    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    const annotations = annotationsN ? (printNode(annotationsN, ctx) ?? empty()) : empty()
    const name = text(nameN.text)
    const value = printNode(valueN, ctx) ?? empty()
    const type = typeN ? concat([text(": "), printNode(typeN, ctx) ?? empty(), text(" ")]) : empty()

    return concat([
        ...leading,
        annotations,
        text("const "),
        name,
        text(" "),
        type,
        text("= "),
        value,
        ...trailing,
    ])
}

export function printMethodDeclaration(node: Node, ctx: Ctx): Doc | undefined {
    const annotationsN = node.childForFieldName("annotations")
    const receiverN = node.childForFieldName("receiver")
    const nameN = node.childForFieldName("name")
    const typeParametersN = node.childForFieldName("type_parameters")
    const parametersN = node.childForFieldName("parameters")
    const returnTypeN = node.childForFieldName("return_type")
    const specialBodyN =
        node.childForFieldName("asm_body") ?? node.childForFieldName("builtin_specifier")
    const bodyN = node.childForFieldName("body") ?? specialBodyN

    if (!receiverN || !nameN || !parametersN || !bodyN) return undefined

    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))

    const annotations = annotationsN ? (printNode(annotationsN, ctx) ?? empty()) : empty()
    const receiver = printNode(receiverN, ctx) ?? empty()
    const name = text(nameN.text)
    const typeParameters = typeParametersN ? (printNode(typeParametersN, ctx) ?? empty()) : empty()
    const parameters = printNode(parametersN, ctx) ?? empty()
    const body = printNode(bodyN, ctx) ?? empty()

    let returnTypePart = empty()
    if (returnTypeN) {
        const returnType = printNode(returnTypeN, ctx) ?? empty()
        returnTypePart = concat([text(": "), returnType])
    }

    const isSpecialBody = specialBodyN !== null

    return concat([
        ...leading,
        annotations,
        text("fun "),
        receiver,
        name,
        typeParameters,
        parameters,
        returnTypePart,
        ...(isSpecialBody ? [indent(concat([hardLine(), body]))] : [text(" "), body]),
    ])
}

export function printGetMethodDeclaration(node: Node, ctx: Ctx): Doc | undefined {
    const annotationsN = node.childForFieldName("annotations")
    const nameN = node.childForFieldName("name")
    const parametersN = node.childForFieldName("parameters")
    const returnTypeN = node.childForFieldName("return_type")
    const bodyN = node.childForFieldName("body")

    if (!nameN || !parametersN || !bodyN) return undefined

    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))

    const annotations = annotationsN ? (printNode(annotationsN, ctx) ?? empty()) : empty()
    const name = text(nameN.text)
    const parameters = printNode(parametersN, ctx) ?? empty()
    const body = printNode(bodyN, ctx) ?? empty()

    let returnTypePart = empty()
    if (returnTypeN) {
        const returnType = printNode(returnTypeN, ctx) ?? empty()
        returnTypePart = concat([text(": "), returnType])
    }

    return concat([
        ...leading,
        annotations,
        text("get fun "),
        name,
        parameters,
        returnTypePart,
        text(" "),
        body,
    ])
}

export function printTolkRequiredVersion(node: Node, ctx: Ctx): Doc | undefined {
    const valueN = node.childForFieldName("value")
    if (!valueN) return undefined

    const value = printNode(valueN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([text("tolk "), value, ...trailing])
}

export function printImportDirective(node: Node, ctx: Ctx): Doc | undefined {
    const pathN = node.childForFieldName("path")
    if (!pathN) return undefined

    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))

    const path = printNode(pathN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([...leading, text("import "), path, ...trailing])
}

export function printGlobalVarDeclaration(node: Node, ctx: Ctx): Doc | undefined {
    const annotationsN = node.childForFieldName("annotations")
    const nameN = node.childForFieldName("name")
    const typeN = node.childForFieldName("type")

    if (!nameN || !typeN) return undefined

    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))

    const annotations = annotationsN ? (printNode(annotationsN, ctx) ?? empty()) : empty()
    const name = printNode(nameN, ctx) ?? empty()
    const type = printNode(typeN, ctx) ?? empty()

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([...leading, annotations, text("global "), name, text(": "), type, ...trailing])
}

export function printStructDeclaration(node: Node, ctx: Ctx): Doc | undefined {
    const annotationsN = node.childForFieldName("annotations")
    const nameN = node.childForFieldName("name")
    const bodyN = node.childForFieldName("body")
    const typeParametersN = node.childForFieldName("type_parameters")
    const packPrefixN = node.childForFieldName("pack_prefix")

    if (!nameN) return undefined

    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))

    const annotations = annotationsN ? (printNode(annotationsN, ctx) ?? empty()) : empty()
    const name = printNode(nameN, ctx) ?? empty()
    const body = bodyN ? (printNode(bodyN, ctx) ?? empty()) : empty()
    const typeParameters = typeParametersN ? (printNode(typeParametersN, ctx) ?? empty()) : empty()
    const packPrefix = packPrefixN
        ? concat([text("("), printNode(packPrefixN, ctx) ?? empty(), text(") ")])
        : empty()

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([
        ...leading,
        annotations,
        text("struct "),
        packPrefix,
        name,
        typeParameters,
        text(" "),
        body,
        ...trailing,
    ])
}

export function printStructBody(node: Node, ctx: Ctx): Doc | undefined {
    const fields = node.namedChildren
        .filter(child => child?.type === "struct_field_declaration")
        .filter(child => child !== null)

    if (fields.length === 0) {
        return text("{}")
    }

    const parts = fields.map(field => printNode(field, ctx) ?? empty())
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    const [first, ...rest] = parts
    const tailDocs = rest.map(part => concat([hardLine(), part]))

    return concat([
        text("{"),
        indent(concat([hardLine(), first, ...tailDocs])),
        hardLine(),
        text("}"),
        ...trailing,
    ])
}

export function printStructFieldDeclaration(node: Node, ctx: Ctx): Doc | undefined {
    const nameN = node.childForFieldName("name")
    const typeN = node.childForFieldName("type")
    const defaultN = node.childForFieldName("default")

    if (!nameN || !typeN) return undefined

    const name = printNode(nameN, ctx) ?? empty()
    const type = printNode(typeN, ctx) ?? empty()
    const defaultVal = defaultN ? (printNode(defaultN, ctx) ?? empty()) : empty()

    const leading = takeLeading(node, ctx.comments)
    const leadingDoc = formatLeading(leading)
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    let result = [name, text(": "), type]

    if (defaultVal.$ !== "Empty") {
        result = [...result, text(" = "), defaultVal]
    }

    return concat([...leadingDoc, ...result, ...trailing])
}

export function printTypeParameters(node: Node, ctx: Ctx): Doc | undefined {
    const params = node.namedChildren
        .filter(child => child?.type === "type_parameter")
        .filter(child => child !== null)

    if (params.length === 0) {
        return text("<>")
    }

    const parts = params.map(param => printNode(param, ctx) ?? empty())
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    if (parts.length === 1) {
        return concat([text("<"), parts[0], text(">"), ...trailing])
    }

    const [first, ...rest] = parts
    const tailDocs = rest.map(part => concat([text(", "), part]))

    return concat([text("<"), first, ...tailDocs, text(">"), ...trailing])
}

export function printTypeParameter(node: Node, ctx: Ctx): Doc | undefined {
    const nameN = node.childForFieldName("name")
    const defaultN = node.childForFieldName("default")

    if (!nameN) return undefined

    const name = printNode(nameN, ctx) ?? empty()
    const defaultVal = defaultN ? (printNode(defaultN, ctx) ?? empty()) : empty()

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    let result = [name]

    if (defaultVal.$ !== "Empty") {
        result = [...result, text(" = "), defaultVal]
    }

    return concat([...result, ...trailing])
}

export function printAsmBody(node: Node, ctx: Ctx): Doc | undefined {
    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))

    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    const strings = node.namedChildren
        .filter(child => child?.type === "string_literal")
        .filter(child => child !== null)

    const stringParts = strings.flatMap(str => {
        const strTrailing = takeTrailing(str, ctx.comments).map(c =>
            concat([text(" "), text(c.text), breakParent()]),
        )
        return [line(), printNode(str, ctx) ?? empty(), ...strTrailing]
    })

    return concat([...leading, text("asm"), group([...stringParts, ...trailing])])
}

export function printMethodReceiver(node: Node, ctx: Ctx): Doc | undefined {
    const receiverTypeN = node.childForFieldName("receiver_type")
    if (!receiverTypeN) return undefined

    const receiverType = printNode(receiverTypeN, ctx) ?? empty()
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    return concat([receiverType, text("."), ...trailing])
}

export function printAnnotationList(node: Node, ctx: Ctx): Doc | undefined {
    const annotations = node.namedChildren
        .filter(child => child?.type === "annotation")
        .filter(child => child !== null)

    if (annotations.length === 0) {
        return empty()
    }

    const parts = annotations.map(annotation => printNode(annotation, ctx) ?? empty())
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    if (trailing.length > 0 && parts.length === 1) {
        // @foo // comment
        // fun foo() {}
        return concat([parts[0], ...trailing, hardLine()])
    }

    const docs: Doc[] = []
    for (const [index, part] of parts.entries()) {
        docs.push(part)

        if (index === parts.length - 1) {
            docs.push(...trailing, hardLine())
        } else {
            docs.push(hardLine())
        }
    }

    return concat(docs)
}

export function printAnnotation(node: Node, ctx: Ctx): Doc | undefined {
    const nameN = node.childForFieldName("name")
    const argumentsN = node.childForFieldName("arguments")

    const name = nameN ? (printNode(nameN, ctx) ?? empty()) : empty()
    const args = argumentsN ? (printNode(argumentsN, ctx) ?? empty()) : empty()

    const trailing = takeTrailing(node, ctx.comments).flatMap(c => [text(" "), text(c.text)])

    return concat([text("@"), name, args, ...trailing])
}

export function printAnnotationArguments(node: Node, ctx: Ctx): Doc | undefined {
    const exprs = node.namedChildren
        .filter(child => child?.type !== "," && child?.type !== "(" && child?.type !== ")")
        .filter(child => child !== null)

    if (exprs.length === 0) {
        return text("()")
    }

    const parts = exprs.map(expr => printNode(expr, ctx) ?? empty())
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

export function printEnumDeclaration(node: Node, ctx: Ctx): Doc | undefined {
    const annotationsN = node.childForFieldName("annotations")
    const nameN = node.childForFieldName("name")
    const backedTypeN = node.childForFieldName("backed_type")
    const bodyN = node.childForFieldName("body")

    if (!nameN) return undefined

    const leading = takeLeading(node, ctx.comments).map(c => concat([text(c.text), hardLine()]))
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    const annotations = annotationsN ? (printNode(annotationsN, ctx) ?? empty()) : empty()
    const name = text(nameN.text)
    const body = bodyN ? (printNode(bodyN, ctx) ?? empty()) : empty()

    let backedTypePart = empty()
    if (backedTypeN) {
        const backedType = printNode(backedTypeN, ctx) ?? empty()
        backedTypePart = concat([text(": "), backedType])
    }

    const hasBody = bodyN !== null

    return concat([
        ...leading,
        annotations,
        text("enum "),
        name,
        backedTypePart,
        ...(hasBody ? [text(" "), body] : []),
        ...trailing,
    ])
}

export function printEnumBody(node: Node, ctx: Ctx): Doc | undefined {
    const members = node.namedChildren
        .filter(child => child?.type === "enum_member_declaration")
        .filter(child => child !== null)

    if (members.length === 0) {
        return text("{}")
    }

    const parts = members.map(member => printNode(member, ctx) ?? empty())
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    if (parts.length === 1) {
        return concat([text("{"), parts[0], text("}"), ...trailing])
    }

    const [first, ...rest] = parts
    const tailDocs = rest.map(part => concat([text(","), hardLine(), part]))

    return concat([
        text("{"),
        indent(concat([hardLine(), first, ...tailDocs])),
        ifBreak(text(","), undefined), // trailing comma
        hardLine(),
        text("}"),
        ...trailing,
    ])
}

export function printEnumMemberDeclaration(node: Node, ctx: Ctx): Doc | undefined {
    const nameN = node.childForFieldName("name")
    const defaultN = node.childForFieldName("default")

    if (!nameN) return undefined

    const name = text(nameN.text)
    const defaultVal = defaultN ? (printNode(defaultN, ctx) ?? empty()) : empty()

    const leading = takeLeading(node, ctx.comments)
    const leadingDoc = formatLeading(leading)
    const trailing = takeTrailing(node, ctx.comments).map(c => concat([text(" "), text(c.text)]))

    let result = [name]

    if (defaultVal.$ !== "Empty") {
        result = [...result, text(" = "), defaultVal]
    }

    return concat([...leadingDoc, ...result, ...trailing])
}
