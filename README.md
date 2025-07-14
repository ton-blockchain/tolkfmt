# tolkfmt

Code formatter for the Tolk programming language.

## Installation

```bash
# Install from npm
npm i -g tolkfmt-test-dev

# Or build locally
git clone https://github.com/ton-blockchain/tolkfmt
cd tolkfmt
yarn install
yarn build
yarn link
```

## Usage

### Basic Commands

```bash
# Format and output to stdout
tolkfmt file.tolk

# Format and rewrite file
tolkfmt --write file.tolk
tolkfmt -w file.tolk

# Check file formatting
tolkfmt --check file.tolk
tolkfmt -c file.tolk

# Format all .tolk files in directory
tolkfmt -w ./src

# Format only a specific range in a file
tolkfmt --range 1:5-3:20 file.tolk
tolkfmt -r 1:5-3:20 file.tolk

# Show version
tolkfmt --version

# Show help
tolkfmt --help
```

### Options

- `-w, --write` - Write result to the same file
- `-c, --check` - Check file formatting (exit code 1 if issues found)
- `-r, --range <range>` - Format only the specified range (format: `startLine:startChar-endLine:endChar`)
- `-v, --version` - Show formatter version
- `-h, --help` - Show help

### Range Formatting

The `--range` option allows you to format only a specific portion of a file.
This is particularly useful for Language Server Protocol (LSP) integrations and text editors.

**Format:** `startLine:startChar-endLine:endChar`

- Lines and characters are **zero-based**
- `startLine:startChar` - Starting position (inclusive)
- `endLine:endChar` - Ending position (inclusive)

**Examples:**

```bash
# Format from line 0, character 5 to line 2, character 15
tolkfmt --range 0:5-2:15 file.tolk

# Format the first line only
tolkfmt --range 0:0-0:999 file.tolk

# Format a specific function (lines 10-25)
tolkfmt --range 10:0-25:0 file.tolk
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT
