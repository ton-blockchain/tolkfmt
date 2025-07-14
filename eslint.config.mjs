import path from "node:path"
import tseslint from "typescript-eslint"
import url from "node:url"
import unusedImports from "eslint-plugin-unused-imports"
import unicornPlugin from "eslint-plugin-unicorn"
import functional from "eslint-plugin-functional"

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

export default tseslint.config(
    // register plugins
    {
        plugins: {
            ["@typescript-eslint"]: tseslint.plugin,
            ["@unused-imports"]: unusedImports,
            functional: functional,
        },
    },

    // add files and folders to be ignored
    {
        ignores: ["**/*.js", "eslint.config.mjs", ".github/*", ".yarn/*", "dist/*", "docs/*"],
    },

    tseslint.configs.all,
    unicornPlugin.configs["flat/all"],

    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname,
            },
        },

        rules: {
            // override typescript-eslint
            "@typescript-eslint/no-inferrable-types": "off",
            "@typescript-eslint/typedef": [
                "error",
                {parameter: true, memberVariableDeclaration: true},
            ],
            "@typescript-eslint/consistent-generic-constructors": ["error", "type-annotation"],
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/explicit-function-return-type": [
                "error",
                {
                    allowExpressions: true,
                },
            ],
            "@typescript-eslint/no-magic-numbers": "off",
            "@typescript-eslint/prefer-readonly-parameter-types": "off",
            "@typescript-eslint/member-ordering": "off",
            "@typescript-eslint/no-use-before-define": "off",

            "@unused-imports/no-unused-imports": "error",

            "functional/type-declaration-immutability": [
                "error",
                {
                    rules: [
                        {
                            identifiers: ".+",
                            immutability: "ReadonlyShallow",
                            comparator: "AtLeast",
                        },
                    ],
                },
            ],
            "functional/readonly-type": ["error", "keyword"],

            // override unicorn
            "unicorn/prevent-abbreviations": "off",
            "unicorn/import-style": "off",
            "unicorn/no-nested-ternary": "off",
            "unicorn/prefer-module": "off",
            "unicorn/prefer-string-replace-all": "off",
            "unicorn/no-process-exit": "off",
            "unicorn/number-literal-case": "off", // prettier changes to lowercase
            "unicorn/no-lonely-if": "off",
            "unicorn/no-keyword-prefix": "off",
            "unicorn/no-array-reduce": "off",
            "unicorn/no-useless-undefined": "off",
        },
    },
)
