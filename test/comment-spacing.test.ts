import {format} from "../src"
import {initParser} from "../src/parser"

describe("Comment spacing", () => {
    beforeAll(async () => {
        await initParser(
            `${__dirname}/../wasm/web-tree-sitter.wasm`,
            `${__dirname}/../wasm/tree-sitter-tolk.wasm`,
        )
    })

    it("should not add extra blank line before comment between statements", async () => {
        const code = `fun test() {
    foo();
    // comment
    bar();
}`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should preserve single blank line before comment", async () => {
        const code = `fun test() {
    foo();

    // comment
    bar();
}`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should handle multiple comments between statements", async () => {
        const code = `fun test() {
    foo();
    // first comment
    // second comment
    bar();
}`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should handle trailing comment after statement", async () => {
        const code = `fun test() {
    foo(); // trailing comment
    bar();
}`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should handle comment between declarations", async () => {
        const code = `fun foo() {
    return 1;
}
// comment between functions
fun bar() {
    return 2;
}`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should handle comment with blank line between declarations", async () => {
        const code = `fun foo() {
    return 1;
}

// comment between functions
fun bar() {
    return 2;
}`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should handle comment in function parameters", async () => {
        const code = `
fun foo(
    a: int,
    b: int,
    // some comment
    mutate c: int
) {}
        `

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should preserve comment before first function parameter", async () => {
        const code = `
fun foo(
    // first param comment
    a: int,
    b: int
) {}
        `

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should preserve mixed comments in function parameters", async () => {
        const code = `
fun foo(
    a: int, // a comment
    // b comment
    b: int = 10,
    mutate c: int // c comment
) {}
        `

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should preserve comments in method parameters", async () => {
        const code = `
fun Foo.bar(
    // self comment
    self,
    // value comment
    value: int
) {}
        `

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should preserve comments in lambda parameters", async () => {
        const code = `
fun test() {
    val cb = fun(
        // x comment
        x: int,
        y: int
    ) {
        return x + y;
    };
}
        `

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })
})
