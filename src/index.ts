import {createTolkParser, initParser} from "./parser"
import {render} from "./render"
import {bindComments} from "./comments"
import type {Ctx} from "./print/ctx"
import {printNode} from "./print/node"
import type {Parser} from "web-tree-sitter"

export interface Position {
    readonly line: number
    readonly character: number
}

export interface Range {
    readonly start: Position
    readonly end: Position
}

export interface FormatOptions {
    readonly maxWidth?: number
    readonly parser?: Parser
    readonly range?: Range
    readonly sortImports?: boolean
}

export const format = async (code: string, opts?: FormatOptions): Promise<string> => {
    const {
        maxWidth = 100,
        parser = await createAndInitTolkParser(),
        range,
        sortImports = false,
    } = opts ?? {}

    const cst = parser.parse(code)

    const rootNode = cst?.rootNode
    if (!rootNode) return code

    const ctx: Ctx = {comments: bindComments(rootNode), range, sortImports}
    const doc = printNode(rootNode, ctx)
    if (!doc) return code

    return render(doc, maxWidth)
}

async function createAndInitTolkParser(): Promise<Parser> {
    await initParser(
        `${__dirname}/../wasm/web-tree-sitter.wasm`,
        `${__dirname}/../wasm/tree-sitter-tolk.wasm`,
    )
    return createTolkParser()
}
