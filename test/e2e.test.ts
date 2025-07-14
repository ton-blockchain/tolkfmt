import {join, normalize} from "node:path"
import type {CommandResult} from "./utils/test-util"
import {runCommand} from "./utils/test-util"
import {readFileSync, rmSync, writeFileSync} from "node:fs"
import {mkdir} from "node:fs/promises"

// disable tests on windows
const testExceptWindows =
    process.platform === "win32" && Boolean(process.env["CI"]) ? test.skip : test

const tolkfmt = async (...args: string[]): Promise<CommandResult> => {
    const tolkfmtPath = normalize(join(__dirname, "..", "bin", "tolkfmt"))
    const command = `node ${tolkfmtPath} ${args.join(" ")}`
    return runCommand(command)
}

const outputDir = join(__dirname, "output")

const goodContract = `
fun test(x: int, y: string): string {
    return x + y
}
`

const badContract = `
fun   test(  x: int,y:string   ): string{
return    x+y;
}
`

const contractWithSyntaxError = `
fun test(x: int, y: string): string {
    return foo("hello world";
}
`

const structCode = `
struct MyStruct {
    x: int = 42,
    y: string = "hello"
}
`

describe("tolkfmt foo.tolk", () => {
    testExceptWindows("Exits with correct code", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "contract.tolk")
        writeFileSync(file, goodContract)
        const result = await tolkfmt(file)
        expect(result).toMatchObject({kind: "exited", code: 0})

        rmSync(file)
    })

    testExceptWindows("Default run", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "contract.tolk")
        writeFileSync(file, goodContract)
        const result = await tolkfmt(file)
        expect(result).toMatchSnapshot()

        rmSync(file)
    })

    testExceptWindows("Default run with write to file", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "contract.tolk")
        writeFileSync(file, badContract)
        await tolkfmt(file, "-w")

        const newContent = readFileSync(file, "utf8")
        expect(newContent).toMatchSnapshot()

        rmSync(file)
    })

    testExceptWindows("Run on directory", async () => {
        const dir = outputDir
        const innerDir = join(dir, "inner")
        const innerInnerDir = join(innerDir, "inner-2")

        await mkdir(dir, {recursive: true})
        await mkdir(innerDir, {recursive: true})
        await mkdir(innerInnerDir, {recursive: true})

        // inner
        //   file1.tolk
        //   inner-2
        //      file2.tolk
        //      file3.tolk
        const file1 = join(innerDir, "file1.tolk")
        const file2 = join(innerInnerDir, "file2.tolk")
        const file3 = join(innerInnerDir, "file3.tolk")

        writeFileSync(file1, "fun foo1() {   }")
        writeFileSync(file2, "fun foo2() {  }")
        writeFileSync(file3, "fun foo3() {     }")

        await tolkfmt(innerDir, "-w")

        expect(readFileSync(file1, "utf8")).toMatchSnapshot()
        expect(readFileSync(file2, "utf8")).toMatchSnapshot()
        expect(readFileSync(file3, "utf8")).toMatchSnapshot()

        rmSync(innerDir, {recursive: true})
    })

    testExceptWindows("Check on directory with formatted files", async () => {
        const dir = outputDir
        const innerDir = join(dir, "inner")
        const innerInnerDir = join(innerDir, "inner-2")

        await mkdir(dir, {recursive: true})
        await mkdir(innerDir, {recursive: true})
        await mkdir(innerInnerDir, {recursive: true})

        const file1 = join(innerDir, "file1.tolk")
        const file2 = join(innerInnerDir, "file2.tolk")
        const file3 = join(innerInnerDir, "file3.tolk")

        writeFileSync(file1, "fun foo1() {}\n")
        writeFileSync(file2, "fun foo2() {}\n")
        writeFileSync(file3, "fun foo3() {}\n")

        const result = await tolkfmt(innerDir, "--check")
        expect(result).toMatchSnapshot()

        rmSync(innerDir, {recursive: true})
    })

    testExceptWindows("Check on directory with not formatted files", async () => {
        const dir = outputDir
        const innerDir = join(dir, "inner")
        const innerInnerDir = join(innerDir, "inner-2")

        await mkdir(dir, {recursive: true})
        await mkdir(innerDir, {recursive: true})
        await mkdir(innerInnerDir, {recursive: true})

        const file1 = join(innerDir, "file1.tolk")
        const file2 = join(innerInnerDir, "file2.tolk")
        const file3 = join(innerInnerDir, "file3.tolk")

        writeFileSync(file1, "fun foo1() {  }\n")
        writeFileSync(file2, "fun foo2() {  }\n")
        writeFileSync(file3, "fun foo3() {  }\n")

        const result = await tolkfmt(innerDir, "--check")
        expect(result).toMatchSnapshot()

        rmSync(innerDir, {recursive: true})
    })

    testExceptWindows("Check on several formatted files", async () => {
        const dir = outputDir
        const innerDir = join(dir, "inner")
        const innerInnerDir = join(innerDir, "inner-2")

        await mkdir(dir, {recursive: true})
        await mkdir(innerDir, {recursive: true})
        await mkdir(innerInnerDir, {recursive: true})

        const file1 = join(innerDir, "file1.tolk")
        const file2 = join(innerInnerDir, "file2.tolk")
        const file3 = join(innerInnerDir, "file3.tolk")

        writeFileSync(file1, "fun foo1() {}\n")
        writeFileSync(file2, "fun foo2() {  }\n") // not checked
        writeFileSync(file3, "fun foo3() {}\n")

        const result = await tolkfmt("--check", file1, file3)
        expect(result).toMatchSnapshot()

        rmSync(innerDir, {recursive: true})
    })

    testExceptWindows("Check on several directories", async () => {
        const dir = outputDir
        const innerDir = join(dir, "inner")
        const innerInnerDir = join(innerDir, "inner-2")
        const innerInnerDir2 = join(innerDir, "inner-3")

        await mkdir(dir, {recursive: true})
        await mkdir(innerDir, {recursive: true})
        await mkdir(innerInnerDir, {recursive: true})
        await mkdir(innerInnerDir2, {recursive: true})

        const file1 = join(innerDir, "file1.tolk")
        const file2 = join(innerInnerDir, "file2.tolk")
        const file3 = join(innerInnerDir2, "file3.tolk")

        writeFileSync(file1, "fun foo1() { }\n") // not checked
        writeFileSync(file2, "fun foo2() {  }\n")
        writeFileSync(file3, "fun foo3() {}\n")

        const result = await tolkfmt("--check", innerInnerDir, innerInnerDir2)
        expect(result).toMatchSnapshot()

        rmSync(innerDir, {recursive: true})
    })

    testExceptWindows("With syntax error", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "contract.tolk")
        writeFileSync(file, contractWithSyntaxError)
        const result = await tolkfmt(file, "-w")

        // Check status without timing details
        expect(result.kind).toBe("exited")
        if (result.kind === "exited") {
            expect(result.code).toBe(0)
            expect(result.stderr).toBe("")
            expect(result.stdout).toMatch(/contract\.tolk \d+ms \(reformatted\)/)
        }

        rmSync(file)
    })

    testExceptWindows("Check and write flags simultaneously", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "contract.tolk")
        writeFileSync(file, badContract)
        const result = await tolkfmt(file, "-w", "--check")
        expect(result).toMatchSnapshot()

        rmSync(file)
    })

    testExceptWindows("Format struct", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "struct.tolk")
        writeFileSync(file, structCode)
        const result = await tolkfmt(file)
        expect(result).toMatchSnapshot()

        rmSync(file)
    })

    testExceptWindows("Version flag", async () => {
        const result = await tolkfmt("--version")
        if (result.kind === "exited") {
            const {stdout} = result
            expect(stdout.split(" ")[0]).toMatchSnapshot()
        }
    })

    testExceptWindows("Help flag", async () => {
        const result = await tolkfmt("--help")
        expect(result).toMatchSnapshot()
    })

    testExceptWindows("No arguments", async () => {
        const result = await tolkfmt()
        expect(result).toMatchSnapshot()
    })

    testExceptWindows("Range formatting: basic", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "range-test.tolk")
        const codeWithBadFormatting = `fun foo(){
    val   x   =   1;
    val   y   =   2;
    val   z   =   3;
    return x + y + z;
}`
        writeFileSync(file, codeWithBadFormatting)

        // Format only the second line (val y = 2)
        const result = await tolkfmt(file, "--range", "1:4-1:20")
        expect(result).toMatchSnapshot()

        rmSync(file)
    })

    testExceptWindows("Range formatting: with check", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "range-check.tolk")
        const codeWithBadFormatting = `fun foo(){
    val   x   =   1;
    val   y   =   2;
    val   z   =   3;
    return x + y + z;
}`
        writeFileSync(file, codeWithBadFormatting)

        // Check only the second line (not formatted)
        const result = await tolkfmt(file, "--range", "1:4-1:20", "--check")
        expect(result).toMatchSnapshot()

        rmSync(file)
    })

    testExceptWindows("Range formatting: multiple lines", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "range-multi.tolk")
        const codeWithBadFormatting = `fun foo(){
    val   x   =   1;
    val   y   =   2;
    val   z   =   3;
    return x + y + z;
}`
        writeFileSync(file, codeWithBadFormatting)

        // Format lines 1-2 (val x and val y)
        const result = await tolkfmt(file, "--range", "1:0-2:20")
        expect(result).toMatchSnapshot()

        rmSync(file)
    })

    testExceptWindows("Range formatting: struct", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "range-struct.tolk")
        const codeWithBadFormatting = `type MyType = int;

struct MyStruct {
    field1:   int;
    field2:   string;
}

fun foo() {
    val   x   =   1;
}`
        writeFileSync(file, codeWithBadFormatting)

        // Format only the struct
        const result = await tolkfmt(file, "--range", "2:0-5:1")
        expect(result).toMatchSnapshot()

        rmSync(file)
    })

    testExceptWindows("Range formatting: invalid format", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "range-invalid.tolk")
        writeFileSync(file, goodContract)

        // Invalid range format
        const result = await tolkfmt(file, "--range", "invalid-range")
        expect(result).toMatchSnapshot()

        rmSync(file)
    })

    testExceptWindows("Range formatting: invalid range values", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "range-invalid-values.tolk")
        writeFileSync(file, goodContract)

        // Invalid range values (not numbers)
        const result = await tolkfmt(file, "--range", "a:b-c:d")
        expect(result).toMatchSnapshot()

        rmSync(file)
    })

    testExceptWindows("Range formatting: short form flag", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "range-short.tolk")
        const codeWithBadFormatting = `fun foo(){
    val   x   =   1;
    val   y   =   2;
}`
        writeFileSync(file, codeWithBadFormatting)

        // Use short form -r flag
        const result = await tolkfmt(file, "-r", "1:4-1:20")
        expect(result).toMatchSnapshot()

        rmSync(file)
    })

    testExceptWindows("Range formatting: zero-based indexing", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "range-zero.tolk")
        const codeWithBadFormatting = `fun foo(){
    val   x   =   1;
}`
        writeFileSync(file, codeWithBadFormatting)

        // Format first line (line 0)
        const result = await tolkfmt(file, "--range", "0:0-0:99")
        expect(result).toMatchSnapshot()

        rmSync(file)
    })

    testExceptWindows("Range formatting: out of bounds", async () => {
        await mkdir(outputDir, {recursive: true})
        const file = join(outputDir, "range-bounds.tolk")
        const shortCode = `fun foo(){}`
        writeFileSync(file, shortCode)

        // Range beyond file bounds, format all file
        const result = await tolkfmt(file, "--range", "0:0-10:50")
        expect(result).toMatchSnapshot()

        rmSync(file)
    })
})
