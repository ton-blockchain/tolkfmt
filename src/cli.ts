import {cac} from "cac"
import * as fs from "node:fs"
import * as path from "node:path"
import {glob} from "glob"
import {format, type Range} from "./index"

const version = "0.0.13"

type FormatMode = "format" | "format-and-write" | "check"

interface FormatFileOptions {
    readonly mode: FormatMode
    readonly range?: Range
    readonly sortImports: boolean
}

async function formatFile(
    filepath: string,
    options: FormatFileOptions,
): Promise<boolean | undefined> {
    const content = readFileOrFail(filepath)
    if (content === undefined) return undefined

    const {mode, range, sortImports} = options

    try {
        const [formattedCode, time] = await measureTime(async () => {
            return format(content, {maxWidth: 100, range, sortImports})
        })

        const alreadyFormatted = content === formattedCode

        if (mode === "check") {
            if (alreadyFormatted) {
                return true
            }
            console.log(`[warn]`, path.basename(filepath))
            return false
        }

        if (mode === "format-and-write") {
            console.log(
                path.basename(filepath),
                `${time.toFixed(0)}ms`,
                status(content, formattedCode),
            )
            fs.writeFileSync(filepath, formattedCode)
            return alreadyFormatted
        } else {
            process.stdout.write(formattedCode)
            return alreadyFormatted
        }
    } catch (error) {
        if (error instanceof Error) {
            console.error(
                `Cannot format file ${path.relative(process.cwd(), filepath)}:`,
                error.message,
            )
        }
        return undefined
    }
}

function status(before: string, after: string): string {
    if (before !== after) {
        return "(reformatted)"
    }
    return "(unchanged)"
}

async function measureTime<T>(fn: () => Promise<T>): Promise<[T, number]> {
    const startTime = performance.now()
    const result = await fn()
    const endTime = performance.now()
    const time = endTime - startTime
    return [result, time]
}

function readFileOrFail(filePath: string): string | undefined {
    try {
        return fs.readFileSync(filePath, "utf8")
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error(`Cannot read file: ${error.message}`)
        }
        return undefined
    }
}

function collectFilesToFormat(paths: string[]): string[] {
    return paths.flatMap(inputPath => {
        if (!fs.existsSync(inputPath)) {
            console.error(`Path does not exist: ${inputPath}`)
            return []
        }

        if (fs.statSync(inputPath).isFile()) {
            return inputPath
        }

        // for directory, find all .tolk files
        return glob.sync("**/*.tolk", {cwd: inputPath}).map(file => path.join(inputPath, file))
    })
}

interface CliOptions {
    readonly write: boolean | undefined
    readonly check: boolean | undefined
    readonly range: string | undefined
    readonly sortImports: boolean | undefined
}

function parseRange(rangeStr: string): Range {
    const regex = /^(\d+):(\d+)-(\d+):(\d+)$/
    const match = regex.exec(rangeStr)
    if (!match) {
        throw new Error(
            "Invalid range format. Expected: startLine:startChar-endLine:endChar (e.g., 1:5-3:10)",
        )
    }

    const [, startLine, startChar, endLine, endChar] = match
    return {
        start: {
            line: Number.parseInt(startLine, 10),
            character: Number.parseInt(startChar, 10),
        },
        end: {
            line: Number.parseInt(endLine, 10),
            character: Number.parseInt(endChar, 10),
        },
    }
}

export async function main(): Promise<void> {
    const cli = cac("tolkfmt")

    cli.version(version)
        .usage("[options] <files or directories>")
        .option("-w, --write", "Write result to same file")
        .option("-c, --check", "Check if the given files are formatted")
        .option(
            "-r, --range <range>",
            "Format only the specified range (format: startLine:startChar-endLine:endChar)",
        )
        .option("-s, --sort-imports", "Sort imports in the formatted file")
        .help()

    const parsed = cli.parse()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const {write, check, range, sortImports = false} = parsed.options as CliOptions
    const filePaths = parsed.args

    if (write !== undefined && check !== undefined) {
        console.error("Error: Cannot use both --write and --check options together")
        process.exit(1)
    }

    let parsedRange: Range | undefined = undefined
    if (range !== undefined) {
        try {
            parsedRange = parseRange(range)
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : "Invalid range format")
            process.exit(1)
        }
    }

    if (filePaths.length === 0) {
        return
    }

    const mode: FormatMode =
        check === undefined ? (write === undefined ? "format" : "format-and-write") : "check"

    if (mode === "check") {
        console.log("Checking formatting...")
    }

    const filesToFormat = collectFilesToFormat([...filePaths])

    if (filesToFormat.length === 0) {
        console.error("No .tolk files found")
        process.exit(1)
    }

    let someFileCannotBeFormatted = false
    let allFormatted = true

    for (const file of filesToFormat) {
        const res = await formatFile(file, {mode, range: parsedRange, sortImports})
        if (res === undefined) {
            someFileCannotBeFormatted = true
        } else {
            allFormatted &&= res
        }
    }

    if (check !== undefined) {
        if (allFormatted) {
            console.log("All Tolk files are properly formatted!")
        } else {
            console.log(
                "Code style issues found in the above files. Run tolkfmt with --write to fix.",
            )
            process.exit(1)
        }
    }

    if (someFileCannotBeFormatted) {
        process.exit(1)
    }
}

process.on("uncaughtException", error => {
    console.error("Unexpected error:", error.message)
    process.exit(1)
})

process.on("unhandledRejection", reason => {
    console.error("Unhandled promise rejection:", reason)
    process.exit(1)
})
