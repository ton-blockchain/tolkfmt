import type {Node} from "web-tree-sitter"
import type {CommentMap} from "./comments"

export type Doc =
    | Text
    | Line
    | SoftLine
    | HardLine
    | Indent
    | Group
    | Concat
    | LineSuffix
    | BreakParent
    | IfBreak
    | Empty

export interface Text {
    readonly $: "Text"
    readonly value: string
}

export const text = (value: string): Doc => ({
    $: "Text",
    value,
})

export interface Line {
    readonly $: "Line"
}

export const line = (): Doc => ({
    $: "Line",
})

export interface SoftLine {
    readonly $: "SoftLine"
}

export const softLine = (): Doc => ({
    $: "SoftLine",
})

export interface HardLine {
    readonly $: "HardLine"
}

export const hardLine = (): Doc => ({
    $: "HardLine",
})

export interface LineSuffix {
    readonly $: "LineSuffix"
    readonly suffix: Doc
}

export const lineSuffix = (suffix: Doc): Doc => ({
    $: "LineSuffix",
    suffix,
})

export interface BreakParent {
    readonly $: "BreakParent"
}

export const breakParent = (): Doc => ({
    $: "BreakParent",
})

export interface IfBreak {
    readonly $: "IfBreak"
    readonly breakContent: Doc | undefined
    readonly flatContent: Doc | undefined
}

export const ifBreak = (
    breakContent: Doc | undefined,
    flatContent: Doc | undefined = undefined,
): Doc => ({
    $: "IfBreak",
    breakContent,
    flatContent,
})

export interface Indent {
    readonly $: "Indent"
    readonly indent: number
    readonly content: Doc
}

export const indent = (content: Doc): Doc => ({
    $: "Indent",
    indent: 4,
    content,
})

export interface Group {
    readonly $: "Group"
    readonly content: Doc
}

export const group = (content: Doc[]): Doc => ({
    $: "Group",
    content: concat(content),
})

export interface Concat {
    readonly $: "Concat"
    readonly parts: Doc[]
}

export const concat = (parts: Doc[]): Doc => ({
    $: "Concat",
    parts,
})

export interface Empty {
    readonly $: "Empty"
}

export const empty = (): Doc => ({
    $: "Empty",
})

export function blankLinesBetween(a: Node, b: Node, comments: CommentMap): number {
    const aTrailing = comments.get(a.id)?.trailing ?? []
    const bLeading = comments.get(b.id)?.leading ?? []

    // If there are trailing comments after `a`, use the last trailing comment as the reference
    // If there are leading comments before `b`, use the first leading comment as the reference
    const {endPosition} = a
    const {startPosition} = b
    let endRow = endPosition.row
    let startRow = startPosition.row

    if (aTrailing.length > 0) {
        const lastTrailing = aTrailing.at(-1)
        if (lastTrailing) {
            const {endRow: lastEndRow} = lastTrailing
            endRow = lastEndRow
        }
    }

    if (bLeading.length > 0) {
        const [firstLeading] = bLeading
        const {startRow: firstStartRow} = firstLeading
        startRow = firstStartRow
    }

    const raw = startRow - endRow - 1
    return Math.max(0, raw)
}

export const blank = (n: number): Doc => (n === 0 ? hardLine() : concat([hardLine(), hardLine()]))
