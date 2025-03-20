# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2025-03-20

### Enhancements

- Added `isEnterprise` metadata field for ICAN addresses

## [1.1.1] - 2025-02-24

### Enhancements

- Added Tron address validation

## [1.1.0] - 2024-12-30

### Enhancements

- Added flag to enable/disable emoji verification
- Added Litecoin addresses
- Added Bitcoin Cash addresses
- Added meta field compatibleWith for same addresses
- Added printFormat and electronicFormat for ICAN
- Removed Node.js 16 support
- Removed Buffer usage

### Bug fixes

- EVM addresses wasn't compatible with EIP-55

## [1.0.1] - 2024-12-22

### Enhancements

- Added support for Core (ICAN) [PR](https://github.com/sergical/blockchain-wallet-validator/pull/3)
- Added support for Node.js 16

## [1.0.0] - 2024-12-17

### Added

- Initial release
- Support for multiple blockchain networks:
  - EVM (Ethereum, Polygon, BSC)
  - ENS Domains and subdomains
  - Bitcoin (Legacy, SegWit, Native SegWit)
  - Solana
  - Cosmos ecosystem
  - Cardano
  - Polkadot
  - Ripple (XRP)
  - Algorand
  - Stellar
- Comprehensive test suite with 100% coverage
- TypeScript support with full type definitions
- ESM and CommonJS module support
- Detailed metadata for each address type
- Bitcoin testnet support
