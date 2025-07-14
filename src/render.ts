import type {Doc} from "./doc"
import {text} from "./doc"
import {empty} from "./doc"

export function render(doc: Doc, printWidth: number): string {
    type Mode = "flat" | "break"

    interface Frame {
        readonly doc: Doc
        readonly mode: Mode
        readonly indent: number
    }

    const out: string[] = []
    const lineSuffix: Doc[] = []
    const stack: Frame[] = [{doc, mode: "break", indent: 0}]

    function fits(d: Doc, w: number): boolean {
        const fitStack: Doc[] = [d]
        let width = w

        while (width >= 0 && fitStack.length > 0) {
            const cur = fitStack.pop() ?? empty()
            switch (cur.$) {
                case "Text": {
                    width -= cur.value.length
                    break
                }
                case "Line": {
                    width -= 1
                    break
                }
                case "SoftLine": {
                    break
                }
                case "HardLine": {
                    return false
                }
                case "Concat": {
                    for (let i = cur.parts.length - 1; i >= 0; i--) {
                        fitStack.push(cur.parts[i])
                    }
                    break
                }
                case "Indent": {
                    fitStack.push(cur.content)
                    break
                }
                case "Group": {
                    fitStack.push(cur.content)
                    break
                }
                case "LineSuffix": {
                    fitStack.push(cur.suffix)
                    break
                }
                case "BreakParent": {
                    return false
                }
                case "IfBreak": {
                    if (cur.flatContent) {
                        fitStack.push(cur.flatContent)
                    }
                    break
                }
                case "Empty": {
                    break
                }
            }
        }
        return width >= 0
    }

    // main loop
    while (stack.length > 0) {
        const {doc: cur, mode, indent} = stack.pop() ?? {doc: empty(), mode: "break", indent: 0}

        switch (cur.$) {
            case "Text": {
                if (cur.value === "\n") {
                    const prev = out.at(-1)
                    // eslint-disable-next-line @typescript-eslint/no-misused-spread
                    if (prev?.[0] === " " && ![...prev].some(it => it !== " ")) {
                        out[out.length - 1] = cur.value
                        break
                    }
                }
                out.push(cur.value)
                break
            }

            case "Line": {
                if (mode === "flat") {
                    out.push(" ")
                } else {
                    flushLineSuffix()
                    if (indent !== 0) {
                        stack.push({doc: text(" ".repeat(indent)), mode: "flat", indent: 0})
                    }
                    stack.push({doc: text("\n"), mode: "flat", indent: 0})
                }
                break
            }

            case "SoftLine": {
                if (mode !== "flat") {
                    flushLineSuffix()
                    if (indent !== 0) {
                        stack.push({doc: text(" ".repeat(indent)), mode: "flat", indent: 0})
                    }
                    stack.push({doc: text("\n"), mode: "flat", indent: 0})
                }
                break
            }

            case "HardLine": {
                flushLineSuffix()
                if (indent !== 0) {
                    stack.push({doc: text(" ".repeat(indent)), mode: "flat", indent: 0})
                }
                stack.push({doc: text("\n"), mode: "flat", indent: 0})
                break
            }

            case "Concat": {
                for (let i = cur.parts.length - 1; i >= 0; i--) {
                    stack.push({doc: cur.parts[i], mode, indent})
                }
                break
            }

            case "Indent": {
                stack.push({doc: cur.content, mode, indent: indent + cur.indent})
                break
            }

            case "Group": {
                const shouldFlat = fits(cur.content, printWidth - currentColumn(out))
                stack.push({doc: cur.content, mode: shouldFlat ? "flat" : "break", indent})
                break
            }

            case "LineSuffix": {
                lineSuffix.push(cur.suffix)
                break
            }

            case "BreakParent": {
                flushLineSuffix()
                break
            }

            case "IfBreak": {
                stack.push({
                    doc:
                        mode === "break"
                            ? (cur.breakContent ?? empty())
                            : (cur.flatContent ?? empty()),
                    mode,
                    indent,
                })
                break
            }

            case "Empty": {
                break
            }
        }
    }

    return out.join("")

    function flushLineSuffix(): void {
        while (lineSuffix.length > 0) {
            const suffix = lineSuffix.shift()
            if (suffix) {
                stack.push({doc: suffix, mode: "flat", indent: 0})
            }
        }
    }
}

function currentColumn(buf: string[]): number {
    let col = 0

    for (let i = buf.length - 1; i >= 0; i--) {
        const piece = buf[i]
        const nl = piece.lastIndexOf("\n")

        if (nl !== -1) {
            return col + piece.length - nl - 1
        }
        col += piece.length
    }
    return col
}
