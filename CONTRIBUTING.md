# Contributing to tolkfmt

Thank you for your interest in contributing to tolkfmt! This document provides information about the development process, useful commands, and guidelines for contributors.

## Development Setup

1. Clone the repository
2. Install dependencies: `yarn install`
3. Build the project: `yarn build`
4. Run tests: `yarn test`

## Commands

## Development

```bash
# Install dependencies
yarn install

# Clean build artifacts
yarn clean

# Build the project
yarn build

# Rebuild (clean + build)
yarn rebuild

# Run tests
yarn test

# Run tests with coverage
yarn test --coverage

# Update test snapshots
yarn test -u

# Run precommit checks (rebuild + test)
yarn precommit
```

## CLI Usage

```bash
# Format and output to stdout
tolkfmt file.tolk

# Format and rewrite file
tolkfmt -w file.tolk

# Format all files in directory
tolkfmt -w ./src

# Check formatting (exit code 1 if issues)
tolkfmt -c file.tolk

# Show version
tolkfmt --version

# Show help
tolkfmt --help
```

## Publishing

```bash
# Test what would be included in package
yarn pack --dry-run

# Publish patch version (0.0.1 -> 0.0.2)
yarn publish-patch

# Publish minor version (0.0.1 -> 0.1.0)
yarn publish-minor

# Publish major version (0.0.1 -> 1.0.0)
yarn publish-major

# Manual version bump and publish
yarn version patch|minor|major
yarn publish
```

## CI/CD Examples

```bash
# Check formatting in CI
tolkfmt -c ./src
if [ $? -ne 0 ]; then
    echo "Code does not conform to formatting style"
    exit 1
fi

# Format all files before commit
tolkfmt -w ./src ./test ./examples

# Pre-commit hook
yarn precommit
```

## Troubleshooting

```bash
# Clear all caches and rebuild
yarn clean
rm -rf node_modules yarn.lock
yarn install
yarn build

# Check for TypeScript errors
yarn tsc --noEmit

# Run specific test
yarn test --testNamePattern="test name"

# Debug CLI
node --inspect bin/tolkfmt file.tolk
```
