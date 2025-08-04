import {createTolkParser, initParser} from "./parser"
import {bindComments} from "./comments"
import {render} from "./render"
import type {Ctx} from "./print/ctx"
import {printNode} from "./print/node"

const main = async (): Promise<void> => {
    await initParser("../wasm/tree-sitter.wasm", "../wasm/tree-sitter-tolk.wasm")

    const parser = createTolkParser()

    const cst = parser.parse(`
fun test(): int
    asm
        // comment 0
        "POP" // comment 1
        // comment 11
        "ADD" // comment 2
        // comment 12
        "AAA" // comment 3
`)
    // bar(/* init: */ true, /* other: */ true /* other after */)

    if (!cst?.rootNode) throw new Error(`Unable to parse file`)

    const ctx: Ctx = {comments: bindComments(cst.rootNode), sortImports: true}
    const doc = printNode(cst.rootNode, ctx)

    if (doc) {
        console.log(render(doc, 50) + "---")
    }
}

void main()
