# Blockchain Wallet Validator

[![npm version](https://badge.fury.io/js/blockchain-wallet-validator.svg)](https://badge.fury.io/js/blockchain-wallet-validator)
[![License: CORE](https://img.shields.io/badge/License-CORE-yellow)](LICENSE)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/blockchain-wallet-validator)](https://bundlephobia.com/package/blockchain-wallet-validator)
[![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://github.com/sergical/blockchain-wallet-validator)
[![codecov](https://codecov.io/github/sergical/blockchain-wallet-validator/graph/badge.svg)](https://github.com/sergical/blockchain-wallet-validator)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

A comprehensive TypeScript library for validating blockchain wallet addresses across multiple networks.

## Features

- 🚀 **Lightweight**: < 10KB minified + gzipped
- 🔒 **Type-safe**: Written in TypeScript with full type definitions
- ⚡ **Fast**: No heavy dependencies
- 🧪 **Well-tested**: Production-ready test coverage
- 🌐 **Multi-network support**:
  - Algorand
  - Bitcoin (Legacy, SegWit, Native SegWit)
  - Bitcoin Cash
  - Cardano
  - Core (ICAN)
  - Cosmos ecosystem (Cosmos, Osmosis, Juno, etc.)
  - NS domains on ENS standard (including subdomains and emoji support)
  - EVM-compatible chains (Ethereum, Polygon, BSC, etc.)
  - Litecoin (Legacy, SegWit, Native SegWit)
  - Polkadot
  - Ripple (XRP)
  - Solana
  - Stellar
  - Tron
- 📦 **Modern package**:
  - ESM and CommonJS support
  - Tree-shakeable
  - Zero configuration
  - Works in Node.js and browsers

## Installation

```bash
# Using pnpm (recommended)
pnpm add blockchain-wallet-validator

# Using npm
npm install blockchain-wallet-validator

# Using yarn
yarn add blockchain-wallet-validator
```

## Usage

```typescript
import { validateWalletAddress } from 'blockchain-wallet-validator';

// Validate an Ethereum address with specific networks enabled
const evmResult = validateWalletAddress(
  '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97',
  { network: ['evm', 'eth'] },
);
console.log(evmResult);
// {
//   network: 'evm',
//   isValid: true,
//   description: 'Ethereum Virtual Machine compatible address (Ethereum, Polygon, BSC, etc.)',
//   metadata: {
//     isChecksumValid: true,
//     format: 'hex'
//   }
// }

// Validate a Name Service domain
const nsResult = validateWalletAddress('vitalik.eth', {
  nsDomains: ['eth'],
  network: ['ns'],
});
console.log(nsResult);
// {
//   network: 'ns',
//   isValid: true,
//   description: 'Ethereum Name Service domain',
//   metadata: {
//     format: 'ens',
//     isSubdomain: false,
//     isEmoji: false
//   }
// }

// Validate a Core (ICAN) address
const coreResult = validateWalletAddress(
  'cb7147879011ea207df5b35a24ca6f0859dcfb145999',
  { network: ['xcb'] },
);
console.log(coreResult);
// {
//   network: 'xcb',
//   isValid: true,
//   description: 'ICAN address for Core blockchain networks',
//   metadata: {
//     format: 'ican',
//     isChecksumValid: true,
//     codename: 'Mainnet',
//     isTestnet: false,
//     isEnterprise: false,
//     printFormat: 'CB71\u00A04787\u00A09011\u00A0EA20\u00A07DF5\u00A0B35A\u00A024CA\u00A06F08\u00A059DC\u00A0FB14\u00A05999',
//     electronicFormat: 'CB7147879011EA207DF5B35A24CA6F0859DCFB145999'
//   }
// }

// Validate with multiple options
const result = validateWalletAddress(
  'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
  {
    network: ['btc'],
    testnet: true,
    enabledLegacy: false,
  },
);
console.log(result);
// {
//   network: 'bitcoin',
//   isValid: true,
//   description: 'Bitcoin Native SegWit address',
//   metadata: {
//     format: 'Native SegWit',
//     isTestnet: true
//   }
// }
```

## API Reference

### validateWalletAddress(address: string, options?: ValidationOptions): NetworkInfo

Validates a blockchain wallet address and returns information about the network it belongs to.

#### Parameters

- `address` (string): The wallet address to validate
- `options` (optional): Validation options
  - `network` (string[] | null): Networks to validate against. Default: null (validates all networks). Example: `['btc', 'eth']`
  - `testnet` (boolean): Whether to validate testnet addresses. Default: false
  - `enabledLegacy` (boolean): Whether to validate legacy address formats. Default: true
  - `emojiAllowed` (boolean): Global default for allowing emoji characters in NS domains. Default: true; can be overridden per domain.
  - `nsDomains` (Array<string | NsDomainConfig>): List of Name Service domains (or domain-specific configuration objects) to validate against. Default: `[]`
    - `NsDomainConfig` structure:
      - `domain` (string, required): Domain suffix to validate (e.g. `'eth'`, `'sol'`)
      - `maxTotalLength` (number, optional): Custom maximum total domain length (default: 255)
      - `maxLabelLength` (number, optional): Custom maximum label length (default: 63)
      - `emojiAllowed` (boolean, optional): Override for emoji allowance on this domain

#### Returns

Returns a `NetworkInfo` object containing:

- `network` (string): The identified blockchain network
- `isValid` (boolean): Whether the address is valid
- `description` (string): Human-readable description of the address type
- `metadata` (object): Additional information about the address
  - Properties vary by network type
  - May include format, checksum validation, testnet status, etc.

## Supported Networks

| Network                | Address Format   | Example                                                    |
| ---------------------- | ---------------- | ---------------------------------------------------------- |
| Algorand               | Base32           | VCMJKWOY5P5P7SKMZFFOCEROPJCZOTIJMNIYNUCKH7LRO45JMJP6UYBIJA |
| Bitcoin Cash           | CashAddr         | bitcoincash:qr7fzmep8g7h7ymfxy74lgc0v950j3r4ecr4wd9r3z     |
| Bitcoin Legacy         | Base58 (1...)    | 1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2                         |
| Bitcoin Native SegWit  | Bech32 (bc1...)  | bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq                 |
| Bitcoin SegWit         | Base58 (3...)    | 3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy                         |
| Cardano                | Bech32           | addr1...                                                   |
| Core                   | ICAN             | cb7147879011ea207df5b35a24ca6f0859dcfb145999               |
| Cosmos                 | Bech32           | cosmos1yw6g44c4pqd2rxgrcqekxg9k8f4fd8xpx2k8c3              |
| ENS                    | name.ns          | vitalik.eth                                                |
| EVM                    | Hex (0x...)      | 0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97                 |
| Litecoin Legacy        | Base58 (L...)    | LaMT348PWRnrqeeWArpwQPbuanpXDZGEUz                         |
| Litecoin Native SegWit | Bech32 (ltc1...) | ltc1qgpn2phk8c7k966xjkz0p5zkf5w7rzeslwj42h                 |
| Litecoin SegWit        | Base58 (M...)    | MJRSgZ3UUFcTBTBAaN38XAXvHAaZe6TMbM                         |
| Polkadot               | SS58             | 1FRMM8PEiWXYax7rpS6X4XZX1aAAxSWx1CrKTyrVYhV24fg            |
| Ripple                 | Base58           | rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh                         |
| Solana                 | Base58           | DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy               |
| Stellar                | Base32           | GBQMXVTR5HQNRGXPR4ZPBOZR7VQXOQMEQMZWIVLIW2MYBXC2HQWZZ4VJ   |
| Tron                   | Base58 (T...)    | TRWBqiqoFZysoAeyR1J35ibuyc8EvhUAoY                         |

## Performance

- Bundle size: < 11KB minified + gzipped
- No runtime dependencies except:
  - `bs58check`: For Bitcoin address validation
  - `ethereum-cryptography`: For EVM checksum validation
- No Buffer dependency (works in modern browsers without polyfills)
- Tree-shakeable: Only imports what you use
- Zero configuration required

## Browser Support

- All modern browsers (Chrome, Firefox, Safari, Edge)
- IE11 not supported

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Build the package
pnpm build

# Check bundle size
pnpm size

# Analyze bundle
pnpm analyze

# Format code
pnpm format

# Lint code
pnpm lint
```

## License

Licensed under the [CORE License](LICENSE).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Environment

- 🌐 **Browser**: Works directly in all modern browsers, no Node.js required
- 📦 **Node.js**: Optional - v18+ recommended if using in Node environment
- 📥 **Package Manager**: If using Node.js, recommended:
  - pnpm (v8.10.0+)
  - npm or yarn are also supported

## Security

This package helps validate the format of blockchain addresses but does not guarantee the security or ownership of the addresses. Always verify addresses through multiple sources before sending any transactions.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## Credits

Created and maintained by [Sergiy Dybskiy](https://github.com/sergical).
