import {format} from "../src"

describe("Dangling comments in blocks", () => {
    test("comment in empty block should remain dangling", async () => {
        const input = `
fun foo() {
    // comment
}

fun bar() {
    print("hello");
}`

        const result = await format(input)
        expect(result).toMatchSnapshot()
    })

    test("multiple comments in empty block", async () => {
        const input = `
fun foo() {
    // first comment
    // second comment
}`

        const result = await format(input)
        expect(result).toMatchSnapshot()
    })

    test("comment in empty block with braces on same line", async () => {
        const input = `
fun foo() { // comment
}`

        const result = await format(input)
        expect(result).toMatchSnapshot()
    })

    test("comment in block with statements should be leading to statement", async () => {
        const input = `
fun foo() {
    // comment
    print("hello");
}`

        const result = await format(input)
        expect(result).toMatchSnapshot()
    })

    test("comment after statement should be trailing", async () => {
        const input = `
fun foo() {
    print("hello"); // comment
}`

        const result = await format(input)
        expect(result).toMatchSnapshot()
    })

    test("comment between statements", async () => {
        const input = `
fun foo() {
    print("first");
    // comment
    print("second");
}`

        const result = await format(input)
        expect(result).toMatchSnapshot()
    })
})
