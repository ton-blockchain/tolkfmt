import type {Node} from "web-tree-sitter"

export interface ImportInfo {
    readonly node: Node
    readonly path: string
    readonly category: ImportCategory
    readonly subcategory: number
}

export enum ImportCategory {
    stdlib = 0,
    relativeCurrent = 1,
    relativeNested = 2,
    relativeParent = 3,
    absolute = 4,
}

export function extractImportPath(node: Node): string {
    const pathN = node.childForFieldName("path")
    if (!pathN) return "" // cannot happen
    return pathN.text.slice(1, -1).replace(/\\/g, "/")
}

export function categorizeImport(path: string): ImportCategory {
    if (path.startsWith("@stdlib/")) {
        return ImportCategory.stdlib
    }

    if (path.startsWith("./")) {
        return ImportCategory.relativeCurrent
    }

    if (path.startsWith("../")) {
        return ImportCategory.relativeParent
    }

    if (path.startsWith("/")) {
        return ImportCategory.absolute
    }

    if (path.includes("/")) {
        return ImportCategory.relativeNested
    }

    return ImportCategory.relativeCurrent
}

export function getImportSubcategory(path: string, category: ImportCategory): number {
    switch (category) {
        case ImportCategory.stdlib: {
            return 0
        }
        case ImportCategory.relativeCurrent: {
            return 0
        }
        case ImportCategory.relativeParent: {
            return (path.match(/\.\.\//g) ?? []).length
        }
        case ImportCategory.relativeNested: {
            return (path.match(/\//g) ?? []).length
        }
        case ImportCategory.absolute: {
            return 0
        }
        default: {
            return 0
        }
    }
}

export function sortImports(imports: ImportInfo[]): ImportInfo[] {
    return imports.sort((a, b) => {
        if (a.category !== b.category) {
            return a.category - b.category
        }

        if (a.subcategory !== b.subcategory) {
            return a.subcategory - b.subcategory
        }

        return a.path.localeCompare(b.path)
    })
}
