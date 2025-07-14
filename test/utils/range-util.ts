import type {Range, Position} from "../../src"

export interface ParsedSelection {
    readonly code: string
    readonly range: Range
}

export function parseSelection(input: string): ParsedSelection {
    const lines = input.split("\n")
    let startPosition: Position | undefined = undefined
    let endPosition: Position | undefined = undefined
    const processedLines: string[] = []

    for (const [lineIndex, line] of lines.entries()) {
        let processedLine = line

        // Find <selection> start
        const selectionStartIndex = line.indexOf("<selection>")
        if (selectionStartIndex !== -1) {
            startPosition = {
                line: lineIndex,
                character: selectionStartIndex,
            }
            processedLine = line.replace("<selection>", "")
        }

        // Find </selection> end
        const selectionEndIndex = processedLine.indexOf("</selection>")
        if (selectionEndIndex !== -1) {
            endPosition = {
                line: lineIndex,
                character: selectionEndIndex,
            }
            processedLine = processedLine.replace("</selection>", "")
        }

        processedLines.push(processedLine)
    }

    if (!startPosition || !endPosition) {
        throw new Error("Selection markers not found or incomplete")
    }

    return {
        code: processedLines.join("\n"),
        range: {
            start: startPosition,
            end: endPosition,
        },
    }
}
