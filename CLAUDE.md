# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A TypeScript library that validates blockchain wallet addresses across 15+ networks. The library is browser-compatible (no Node.js Buffer dependency) and tree-shakeable, with support for ESM and CommonJS formats.

**Key constraints:**
- Lightweight: Target < 11KB minified + gzipped
- Zero runtime dependencies except `bs58check` and `ethereum-cryptography`
- Must work in browsers without polyfills
- Tree-shakeable exports

## Development Commands

```bash
# Install dependencies (pnpm required)
pnpm install

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage (must meet thresholds: branches 91%, functions 100%, lines 88%, statements 88%)
pnpm test:coverage

# Build the package (generates dist/index.cjs, dist/index.mjs, dist/index.d.ts)
pnpm build

# Lint code
pnpm lint

# Format code
pnpm format

# Check bundle size against limits
pnpm size

# Analyze bundle composition
pnpm analyze
```

## Testing

Run a single test file:
```bash
pnpm test src/__tests__/index.test.ts
```

Run tests matching a pattern:
```bash
pnpm test -t "EVM Addresses"
```

## Architecture

### Single Entry Point Design

The entire library is in `src/index.ts` (~800 lines). This monolithic approach is intentional for:
- Optimal tree-shaking
- Minimal bundle overhead
- Simple maintenance

### Core Validation Flow

1. **Options validation** (`validateOptions()`) - Validates input options before processing
2. **Network-specific patterns** - Each network has regex patterns in the `patterns` object
3. **Priority-based matching** - Networks checked in order to avoid conflicts:
   - NS domains (first, if `nsDomains` provided)
   - EVM addresses (0x prefix)
   - Core/ICAN addresses (cb/ce/ab prefix)
   - Bitcoin variants (legacy/SegWit/native SegWit)
   - Litecoin variants
   - Cosmos ecosystem
   - Cardano (mainnet/testnet/stake addresses)
   - XRP (r prefix)
   - Tron (T prefix)
   - Solana (after excluding conflicts)
   - Polkadot
   - Algorand
   - Stellar (G prefix)
   - Bitcoin Cash (CashAddr)

### Helper Functions

- `enabledNetwork()` - Checks if a network is in the allowed list
- `validateEVMChecksum()` - EIP-55 checksum validation using keccak256
- `validateICANChecksum()` - IBAN-style mod-97 checksum for Core blockchain
- `bytesToHex()` - Browser-compatible byte array to hex conversion

### Network Metadata

Each validation returns a `NetworkInfo` object with:
- `network` - Network identifier (e.g., 'evm', 'btc', 'ada')
- `isValid` - Boolean validation result
- `description` - Human-readable description
- `metadata` - Network-specific info (format, testnet flag, checksums, etc.)

## Critical Implementation Details

### Browser Compatibility

- **No Buffer usage** - Use `Uint8Array` and `TextEncoder` instead
- **No Node.js crypto** - Use `ethereum-cryptography` package for keccak256
- Base58 validation uses `bs58check` which works in browsers

### Checksum Validation Behavior

**EVM addresses:** Skip checksum validation for all-lowercase or all-uppercase addresses unless `forceChecksumValidation` is true. This allows both checksummed and non-checksummed addresses.

**ICAN addresses:** Always validate checksum using mod-97 algorithm.

### Network Conflict Resolution

Order matters! Patterns that could match multiple networks are checked in priority order:
- Check specific prefixes first (T for Tron, r for XRP, 0x for EVM)
- Check base58 addresses last (Solana, Polkadot) with conflict exclusions
- NS domains bypass all other checks when `nsDomains` is provided

### Options System

- `network`: Filter to specific networks (e.g., `['btc', 'eth']`). `null` = all networks.
- `testnet`: Enable testnet address validation
- `enabledLegacy`: Enable legacy address formats (default: true)
- `emojiAllowed`: Allow emoji in NS domains (default: true)
- `nsDomains`: Array of TLDs to validate (e.g., `['eth', 'crypto']`)

## Adding New Networks

When adding a new blockchain network:

1. Add pattern to `patterns` object
2. Add validation logic in `validateWalletAddress()` in priority order
3. Consider conflicts with existing patterns
4. Add comprehensive tests covering:
   - Valid mainnet addresses
   - Valid testnet addresses (if applicable)
   - Invalid formats
   - Edge cases (wrong prefix, length, characters)
5. Update `NetworkInfo` metadata structure if needed
6. Run bundle size check: `pnpm size`

## Build System

- **tsup** - Bundles to CJS (.cjs) and ESM (.mjs) with TypeScript declarations
- **size-limit** - Enforces bundle size limits (configured in .size-limit.json)
- **vitest** - Testing with coverage thresholds enforced

## Type Safety

The codebase uses TypeScript strict mode. Key interfaces:
- `ValidationOptions` - Input options for validation
- `NetworkInfo` - Validation result structure

Both are exported from the main entry point.

## Publishing

The package uses [npm trusted publishers](https://docs.npmjs.com/trusted-publishers) for secure OIDC-based publishing (no tokens required).

**Release process:**
1. Update version in `package.json`
2. Update `CHANGELOG.md` with release notes
3. Commit changes to `main`
4. Create a GitHub release with tag `vX.Y.Z`
5. The `publish.yml` workflow runs automatically and publishes to npm

**Workflow location:** `.github/workflows/publish.yml`
