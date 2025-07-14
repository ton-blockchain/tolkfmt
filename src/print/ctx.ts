import type {CommentMap} from "../comments"
import type {Range} from "../index"

export interface Ctx {
    readonly comments: CommentMap
    readonly range?: Range
    readonly sortImports: boolean
}
