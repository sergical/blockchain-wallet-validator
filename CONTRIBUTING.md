# Contributing

Thanks for your interest in contributing to blockchain-wallet-validator!

## Prerequisites

- Node.js 18+
- pnpm

## Setup

```bash
git clone https://github.com/sergical/blockchain-wallet-validator.git
cd blockchain-wallet-validator
pnpm install
```

## Development

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Lint
pnpm lint

# Format
pnpm format

# Build
pnpm build

# Check bundle size
pnpm size
```

## Adding a New Network

1. Add the regex pattern to the `patterns` object in `src/index.ts`
2. Add validation logic in `validateWalletAddress()` (order matters for conflict resolution)
3. Add tests covering:
   - Valid mainnet addresses
   - Valid testnet addresses (if applicable)
   - Invalid formats and edge cases
4. Run `pnpm size` to ensure bundle size stays within limits

## Submitting a PR

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Ensure tests pass: `pnpm test`
4. Ensure coverage thresholds are met: `pnpm test:coverage`
5. Ensure bundle size is within limits: `pnpm size`
6. Submit a PR with a clear description of the changes

## Code Style

This project uses ESLint and Prettier. Run `pnpm format` before committing.
