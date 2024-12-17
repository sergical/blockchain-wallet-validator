# Blockchain Wallet Validator

A comprehensive TypeScript/JavaScript library for validating blockchain wallet addresses across multiple networks.

## Installation

```bash
npm install blockchain-wallet-validator
```

## Usage

```typescript
import { validateWalletAddress } from "blockchain-wallet-validator";

const result = validateWalletAddress(
  "0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97"
);
console.log(result);
// {
//   network: 'evm',
//   isValid: true,
//   description: 'Ethereum Virtual Machine compatible address'
// }
```

## Supported Networks

- Ethereum (EVM)
- ENS Domains
- Solana
- Cosmos ecosystem
- Bitcoin
- Cardano
- Polkadot

## License

MIT
