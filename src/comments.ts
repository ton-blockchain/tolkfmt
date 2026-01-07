import type {Node as SyntaxNode, Node} from "web-tree-sitter"

export interface CommentInfo {
    readonly node: Node
    readonly start: number
    readonly end: number
    readonly startRow: number
    readonly endRow: number
    readonly text: string
}

// eslint-disable-next-line functional/type-declaration-immutability
export interface Bound {
    leading: CommentInfo[]
    trailing: CommentInfo[]
    dangling: CommentInfo[]
}

// eslint-disable-next-line functional/type-declaration-immutability
export type CommentMap = Map<number /* node.id */, Bound>

function isReallyTrailing(node: Node): boolean {
    const {nextSibling} = node
    if (nextSibling?.type === "comment") {
        // simple case
        return true
    }
    const nextNextSibling = nextSibling?.nextSibling
    if (nextSibling?.type === ",") {
        if (node.type === "call_argument") {
            // cannot step over comma in `foo(...)`
            return false
        }
    }
    if (nextNextSibling?.type === "comment") {
        return true
    }
    // likely not a trailing
    return false
}

export function bindComments(root: Node): CommentMap {
    const comments = collectComments(root)
    const byNode: CommentMap = new Map()

    const nodes = collectNamedNodes(root)

    // console.error("nodes:", nodes.map(it => "`" + it.text + `\` (${it.type})`).join("\n"))

    let index = 0

    outer: while (index < comments.length) {
        for (const node of nodes) {
            while (index < comments.length && comments[index].end <= node.startIndex) {
                attachLeading(comments[index++], node, byNode)
                continue outer
            }

            const lastTok = lastTokenRow(node)
            while (
                index < comments.length &&
                comments[index].start >= lastTok.endIndex &&
                comments[index].startRow === lastTok.endPosition.row &&
                isReallyTrailing(node)
            ) {
                attachTrailing(comments[index++], node, byNode)
                continue outer
            }

            while (
                index < comments.length &&
                comments[index].start > node.startIndex &&
                comments[index].end < node.endIndex &&
                !isInsideChild(comments[index].node, node)
            ) {
                attachDangling(comments[index++], node, byNode)
                continue outer
            }

            // Special handling for block_statement: comments inside empty blocks or between statements
            if (
                node.type === "block_statement" &&
                index < comments.length &&
                comments[index].start > node.startIndex &&
                comments[index].end < node.endIndex
            ) {
                const comment = comments[index]
                const statements = node.namedChildren.filter(child => child.type !== "comment")

                // If block has no statements, comment should be dangling
                if (statements.length === 0) {
                    attachDangling(comments[index++], node, byNode)
                    continue outer
                }

                // Check if comment is between statements or not attached to any statement
                let attachedToStatement = false
                for (const stmt of statements) {
                    if (comment.end <= stmt.startIndex) {
                        // Comment is before this statement, should be leading to statement
                        attachedToStatement = true
                        break
                    }
                    if (comment.start >= stmt.endIndex) {
                        // Check if comment is on the same line as statement end - should be trailing
                        if (comment.startRow === stmt.endPosition.row) {
                            attachedToStatement = true
                            break
                        }
                        // Comment might be after this statement, continue checking
                        continue
                    }
                    if (comment.start >= stmt.startIndex && comment.end <= stmt.endIndex) {
                        // Comment is inside statement, let normal logic handle it
                        attachedToStatement = true
                        break
                    }
                }

                if (!attachedToStatement) {
                    attachDangling(comments[index++], node, byNode)
                    continue outer
                }
            }
        }

        const comment = comments[index]
        const parent = parentOfType(comment.node, "block_statement", "source_file")

        if (parent) {
            attachDangling(comment, parent, byNode)
        }

        // TODO: warn, we cannot attach comment!
        index++
    }

    while (index < comments.length) {
        attachTrailing(comments[index++], root, byNode)
    }

    return byNode
}

function lastTokenRow(node: Node): Node {
    let cur: Node = node
    while (cur.namedChildCount > 0) {
        cur = cur.namedChildren[cur.namedChildCount - 1] ?? undefined
    }
    return cur
}

export function getLeading(node: Node, comments: CommentMap): CommentInfo[] {
    const entry = comments.get(node.id)
    if (!entry) return []
    return entry.leading
}

export function getTrailing(node: Node, comments: CommentMap): CommentInfo[] {
    const entry = comments.get(node.id)
    if (!entry) return []
    return entry.trailing
}

export function takeLeading(node: Node, comments: CommentMap): CommentInfo[] {
    const entry = comments.get(node.id)
    if (!entry) return []
    const out = entry.leading
    entry.leading = []
    return out
}

export function takeTrailing(node: Node, comments: CommentMap): CommentInfo[] {
    const entry = comments.get(node.id)
    if (!entry) return []
    const out = entry.trailing
    entry.trailing = []
    return out
}

export function takeDangling(node: Node, comments: CommentMap): CommentInfo[] {
    const entry = comments.get(node.id)
    if (!entry) return []
    const out = entry.dangling
    entry.dangling = []
    return out
}

function dfs(n: Node, cb: (n: Node) => void): void {
    cb(n)
    for (const child of n.namedChildren) {
        dfs(child, cb)
    }
}

function collectComments(root: Node): CommentInfo[] {
    const out: CommentInfo[] = []
    dfs(root, n => {
        if (n.type === "comment") {
            out.push({
                node: n,
                text: n.text,
                start: n.startIndex,
                end: n.endIndex,
                startRow: n.startPosition.row,
                endRow: n.endPosition.row,
            })
        }
    })
    return out.sort((a, b) => a.start - b.start)
}

function collectNamedNodes(root: Node): Node[] {
    const res: Node[] = []
    dfs(root, n => {
        if (n.isNamed && n.type !== "comment") res.push(n)
    })
    return res.sort((a, b) => a.startIndex - b.startIndex)
}

function ensureEntry(n: Node, map: CommentMap): Bound {
    let e = map.get(n.id)
    if (!e) {
        e = {leading: [], trailing: [], dangling: []}
        map.set(n.id, e)
    }
    return e
}

function attachLeading(c: CommentInfo, node: Node, map: CommentMap): void {
    // console.error(`attach leading ${c.text} to ${node.text}, id: ${node.id}, type: ${node.type}`)
    ensureEntry(node, map).leading.push(c)
}

function attachTrailing(c: CommentInfo, node: Node, map: CommentMap): void {
    // console.error(`attach trailing ${c.text} to ${node.text}, id: ${node.id}, type: ${node.type}`)
    ensureEntry(node, map).trailing.push(c)
}

function attachDangling(c: CommentInfo, node: Node, map: CommentMap): void {
    // console.error(`attach dangling ${c.text} to ${node.text}, id: ${node.id}, type: ${node.type}`)
    ensureEntry(node, map).dangling.push(c)
}

function isInsideChild(comment: Node, parent: Node): boolean {
    for (const child of parent.namedChildren) {
        if (child.startIndex <= comment.startIndex && child.endIndex >= comment.endIndex) {
            return true
        }
    }
    return false
}

function parentOfType(node: SyntaxNode, ...types: readonly string[]): SyntaxNode | undefined {
    let {parent} = node

    for (let i = 0; i < 100; i++) {
        if (parent === null) return undefined
        if (types.includes(parent.type)) return parent
        const {parent: newParent} = parent
        parent = newParent
    }

    return undefined
}
