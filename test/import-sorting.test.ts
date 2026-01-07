import {format} from "../src"
import {initParser} from "../src/parser"

describe("Import sorting", () => {
    beforeAll(async () => {
        await initParser(
            `${__dirname}/../wasm/web-tree-sitter.wasm`,
            `${__dirname}/../wasm/tree-sitter-tolk.wasm`,
        )
    })

    it("should sort stdlib imports first", async () => {
        const code = `
import "./local"
import "@stdlib/hash"
import "other"
import "@stdlib/array"

fun test() {}`

        const result = await format(code, {sortImports: true})
        expect(result).toMatchSnapshot()
    })

    it("should sort relative imports by category", async () => {
        const code = `
import "../parent"
import "./local"
import "nested/file"
import "../../grandparent"
import "./other_local"

fun test() {}`

        const result = await format(code, {sortImports: true})
        expect(result).toMatchSnapshot()
    })

    it("should sort nested imports by depth", async () => {
        const code = `
import "nested/deep/very/deep"
import "nested/file"
import "nested/deep/file"
import "simple"

fun test() {}`

        const result = await format(code, {sortImports: true})
        expect(result).toMatchSnapshot()
    })

    it("should sort parent imports by depth", async () => {
        const code = `
import "../../file"
import "../../../deep"
import "../parent"
import "../../../../very_deep"

fun test() {}`

        const result = await format(code, {sortImports: true})
        expect(result).toMatchSnapshot()
    })

    it("should sort alphabetically within same category", async () => {
        const code = `
import "@stdlib/z"
import "@stdlib/a"
import "@stdlib/m"
import "./z"
import "./a"
import "./m"

fun test() {}`

        const result = await format(code, {sortImports: true})
        expect(result).toMatchSnapshot()
    })

    it("should preserve comments with imports", async () => {
        const code = `
import "./local" // comment
import "@stdlib/hash"
// comment before
import "other"

fun test() {}`

        const result = await format(code, {sortImports: true})
        expect(result).toMatchSnapshot()
    })

    it("should handle mixed import types", async () => {
        const code = `
import "nested/deep/file"
import "../parent"
import "@stdlib/string"
import "./local"
import "absolute"
import "@stdlib/array"
import "../../grandparent"
import "./other"

fun test() {}`

        const result = await format(code, {sortImports: true})
        expect(result).toMatchSnapshot()
    })

    it("should support Windows paths", async () => {
        const code = `
import "nested\\deep\\file"
import ".\\local"
import "..\\parent"
import "@stdlib/array"

fun test() {}`

        const result = await format(code, {sortImports: true})
        expect(result).toMatchSnapshot()
    })

    it("should treat paths without leading slash as relative", async () => {
        const code = `
import "simple_file"
import "nested/file"
import "./explicit_current"
import "@stdlib/array"

fun test() {}`

        const result = await format(code, {sortImports: true})
        expect(result).toMatchSnapshot()
    })

    it("should keep inline comments", async () => {
        const code = `
import "simple_file" // comment 1
import "nested/file" // comment 2
import "./explicit_current" // comment 3
import "@stdlib/array" // comment 4

fun test() {}`

        const result = await format(code, {sortImports: true})
        expect(result).toMatchSnapshot()
    })

    it("should keep trailing comments", async () => {
        const code = `
// comment 1
import "simple_file"
// comment 2
import "nested/file"
// comment 3
import "./explicit_current"
// comment 4
import "@stdlib/array"

fun test() {}`

        const result = await format(code, {sortImports: true})
        expect(result).toMatchSnapshot()
    })

    it("should treat paths with leading slash as absolute", async () => {
        const code = `
import "/absolute/path"
import "relative/path"
import "./current"
import "@stdlib/array"

fun test() {}`

        const result = await format(code, {sortImports: true})
        expect(result).toMatchSnapshot()
    })

    it("should not sort imports when flag is disabled", async () => {
        const code = `
import "./local"
import "@stdlib/hash"
import "other"
import "@stdlib/array"

fun test() {}`

        const result = await format(code, {sortImports: false})
        expect(result).toMatchSnapshot()
    })

    it("should not sort imports by default", async () => {
        const code = `
import "./local"
import "@stdlib/hash"
import "other"
import "@stdlib/array"

fun test() {}`

        const result = await format(code) // no sortImports flag
        expect(result).toMatchSnapshot()
    })
})
