import {format} from "../src"
import {initParser} from "../src/parser"
import {parseSelection} from "./utils/range-util"

describe("Range Formatter", () => {
    beforeAll(async () => {
        await initParser(
            `${__dirname}/../wasm/tree-sitter.wasm`,
            `${__dirname}/../wasm/tree-sitter-tolk.wasm`,
        )
    })

    it("should format only selected variable declaration", async () => {
        const input = `fun foo() {
    val   x   =   1;
    <selection>val   y   =   2;</selection>
    val   z   =   3;
}`

        const {code, range} = parseSelection(input)
        const result = await format(code, {range})

        expect(result).toMatchSnapshot()
    })

    it("should format only selected function signature", async () => {
        const input = `<selection>fun foo(){</selection>
    val   x   =   1;
    val   y   =   2;
    val   z   =   3;
}`

        const {code, range} = parseSelection(input)
        const result = await format(code, {range})

        expect(result).toMatchSnapshot()
    })

    it("should format multiple selected lines", async () => {
        const input = `fun foo() {
    <selection>val   x   =   1;
    val   y   =   2;</selection>
    val   z   =   3;
}`

        const {code, range} = parseSelection(input)
        const result = await format(code, {range})

        expect(result).toMatchSnapshot()
    })

    it("should format selected expression", async () => {
        const input = `fun foo() {
    val x = <selection>someVeryLongQualifier.someLongField()</selection>;
    val y    =      2;
}`

        const {code, range} = parseSelection(input)
        const result = await format(code, {range, maxWidth: 30})

        expect(result).toMatchSnapshot()
    })

    it("should format selected function call with long arguments", async () => {
        const input = `fun foo() {
    val x =     1;
    <selection>bar(veryLongArgument1, veryLongArgument2, veryLongArgument3)</selection>;
    val y = 2;
}`

        const {code, range} = parseSelection(input)
        const result = await format(code, {range, maxWidth: 30})

        expect(result).toMatchSnapshot()
    })

    it("should format selected function call with long arguments 2", async () => {
        const input = `fun onBouncedMessage(in: InMessageBounced) {
    <selection>in.bouncedBody.skipBouncedPrefix();</selection>

    val msg = lazy BounceOpToHandle.fromSlice(in.bouncedBody);
}
`

        const {code, range} = parseSelection(input)
        const result = await format(code, {range, maxWidth: 30})

        expect(result).toMatchSnapshot()
    })

    it("should format selected struct definition", async () => {
        const input = `type MyType    =   int



<selection>struct MyStruct {
    field1: int;
    field2: string;
}</selection>

fun foo() {
    val x = 1;
}`

        const {code, range} = parseSelection(input)
        const result = await format(code, {range})

        expect(result).toMatchSnapshot()
    })

    it("should format selected struct definition and function with comment after it", async () => {
        const input = `
<selection>struct MyStruct</selection> {
    field1: int;
    field2: string;
}

// comment
fun foo() {
    val x = 1;
}
`

        const {code, range} = parseSelection(input)
        const result = await format(code, {range})

        expect(result).toMatchSnapshot()
    })
})
