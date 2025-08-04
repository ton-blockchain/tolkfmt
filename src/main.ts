import {createTolkParser, initParser} from "./parser"
import {bindComments} from "./comments"
import {render} from "./render"
import type {Ctx} from "./print/ctx"
import {printNode} from "./print/node"

const main = async (): Promise<void> => {
    await initParser("../wasm/tree-sitter.wasm", "../wasm/tree-sitter-tolk.wasm")

    const parser = createTolkParser()

    const cst = parser.parse(`
fun main() {
    (
        makeNullable(a), -100, makeNullable(b), -100, makeNullable<int, null>(9), -100, makeNullable<slice, null>(null), -100,
    );
}
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
