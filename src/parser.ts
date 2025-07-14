import {Parser, Language} from "web-tree-sitter"

export let tolkLanguage: Language | undefined = undefined

export const initParser = async (treeSitterUri: string, tolkLangUri: string): Promise<void> => {
    if (tolkLanguage) {
        return
    }
    const options: object | undefined = {
        locateFile() {
            return treeSitterUri
        },
    }
    await Parser.init(options)
    tolkLanguage = await Language.load(tolkLangUri)
}

export function createTolkParser(): Parser {
    const parser = new Parser()
    if (tolkLanguage) {
        parser.setLanguage(tolkLanguage)
    }
    return parser
}
