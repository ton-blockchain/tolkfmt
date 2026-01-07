import {format} from "../src"
import {initParser} from "../src/parser"

describe("fmt-ignore directive", () => {
    beforeAll(async () => {
        await initParser(
            `${__dirname}/../wasm/web-tree-sitter.wasm`,
            `${__dirname}/../wasm/tree-sitter-tolk.wasm`,
        )
    })

    it("should ignore formatting for top-level function declaration", async () => {
        const code = `
// fmt-ignore
fun foo(){
    val   x   =   1;
    return    x;
}

fun bar() {
    val   y   =   2;
    return y;
}`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should ignore formatting for struct declaration", async () => {
        const code = `
// fmt-ignore
struct MyStruct {
    field1:   int;
    field2:   string;
}

struct OtherStruct {
    field1:   int;
    field2:   string;
}`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should ignore formatting for statements in block", async () => {
        const code = `
fun foo() {
    val x = 1;

    // fmt-ignore
    val   y   =   2;

    val z = 3;
    return x + y + z;
}`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should ignore formatting for multiple consecutive statements", async () => {
        const code = `
fun foo() {
    val x = 1;

    // fmt-ignore
    val   y   =   2;
    // fmt-ignore
    val   z   =   3;

    return x + y + z;
}`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should ignore formatting for global variable declaration", async () => {
        const code = `
// fmt-ignore
global   global_var   :   int;

global other_var: int;`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should ignore formatting for type alias", async () => {
        const code = `
// fmt-ignore
type   MyType   =   int   |   string;

type OtherType = int   |   string;`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should ignore formatting with comments on same line", async () => {
        const code = `
fun foo() {
    val x = 1;

    // fmt-ignore
    val   y   =   2;  // this is a comment

    val z = 3;
}`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should handle fmt-ignore with extra whitespace", async () => {
        const code = `
//   fmt-ignore
fun foo(){
    val   x   =   1;
}`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should not ignore with incorrect directive", async () => {
        const code = `
// fmt-ignore-wrong
fun foo(){
    val   x   =   1;
    return x;
}

// format-ignore
fun bar(){
    val   y   =   2;
    return y;
}`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should ignore return statement", async () => {
        const code = `
fun foo() {
    val x = 1;

    // fmt-ignore
    return    x   +   2;
}`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should ignore if statement", async () => {
        const code = `
fun foo() {
    val x = 1;

    // fmt-ignore
    if(x   >   0){
        return   true;
    }

    return false;
}`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should ignore while statement", async () => {
        const code = `
fun foo() {
    // fmt-ignore
    while(x   <   10){
        x   =   x   +   1;
    }
}`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })

    it("should work with block formatting", async () => {
        const code = `
fun foo() {
    // fmt-ignore
    {
        val   x   =   1;
        val   y   =   2;
    }

    {
        val   a   =   3;
        val   b   =   4;
    }
}`

        const result = await format(code)
        expect(result).toMatchSnapshot()
    })
})
