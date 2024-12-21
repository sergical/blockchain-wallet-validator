import { keccak256 } from 'ethereum-cryptography/keccak';
import base58check from 'bs58check';

interface NetworkInfo {
  network: string;
  isValid: boolean;
  description?: string;
  metadata?: Record<string, any>;
}

interface ValidationOptions {
  network?: string;
  testnet?: boolean;
}

/**
 * Validates a blockchain wallet address and returns information about the network it belongs to
 * @param address The wallet address to validate
 * @param options Optional validation options
 * @returns NetworkInfo object containing validation results
 */
export function validateWalletAddress(
  address: string,
  options: ValidationOptions = {},
): NetworkInfo {
  // Handle empty or invalid input
  if (!address || typeof address !== 'string') {
    return {
      network: 'unknown',
      isValid: false,
      description: 'Invalid input',
    };
  }

  address = address.trim();

  // Handle empty string after trim
  if (!address) {
    return {
      network: 'unknown',
      isValid: false,
      description: 'Empty address',
    };
  }

  // Handle invalid characters early
  if (/[^a-zA-Z0-9-._]/.test(address)) {
    return {
      network: 'unknown',
      isValid: false,
      description: 'Contains invalid characters',
    };
  }

  // Handle EVM-like addresses first (including invalid ones)
  if (address.startsWith('0x')) {
    // Check for exact length and valid hex characters
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return {
        network: 'unknown',
        isValid: false,
        description: 'Invalid EVM address format',
      };
    }

    const isChecksumValid = validateEVMChecksum(address);
    return {
      network: 'evm',
      isValid: isChecksumValid,
      description:
        'Ethereum Virtual Machine compatible address (Ethereum, Polygon, BSC, etc.)',
      metadata: {
        isChecksumValid,
        format: 'hex',
      },
    };
  }

  // ENS Domain
  if (/^[a-zA-Z0-9-]+\.eth$/.test(address)) {
    return {
      network: 'evm',
      isValid: true,
      description: 'Ethereum Name Service domain',
      metadata: {
        format: 'ens',
        isSubdomain: false,
      },
    };
  }

  // ENS Subdomain
  if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.eth$/.test(address)) {
    return {
      network: 'evm',
      isValid: true,
      description: 'Ethereum Name Service domain',
      metadata: {
        format: 'ens',
        isSubdomain: true,
      },
    };
  }

  // Handle invalid ENS-like addresses
  if (address.includes('.eth')) {
    return {
      network: 'unknown',
      isValid: false,
      description: 'Invalid ENS domain format',
    };
  }

  // Bitcoin addresses (check before general base58 patterns)
  // Legacy
  if (/^1[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address)) {
    try {
      base58check.decode(address);
      return {
        network: 'bitcoin',
        isValid: true,
        description: 'Bitcoin Legacy address',
        metadata: {
          format: 'Legacy',
          isTestnet: false,
        },
      };
    } catch {
      return {
        network: 'unknown',
        isValid: false,
        description: 'Invalid Bitcoin Legacy address',
      };
    }
  }

  // SegWit
  if (/^3[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address)) {
    try {
      base58check.decode(address);
      return {
        network: 'bitcoin',
        isValid: true,
        description: 'Bitcoin SegWit address',
        metadata: {
          format: 'SegWit',
          isTestnet: false,
        },
      };
    } catch {
      return {
        network: 'unknown',
        isValid: false,
        description: 'Invalid Bitcoin SegWit address',
      };
    }
  }

  // Native SegWit (bech32)
  if (/^(bc1|tb1)[a-zA-HJ-NP-Z0-9]{25,89}$/.test(address)) {
    const isTestnet = address.startsWith('tb1');
    if (isTestnet && !options.testnet) {
      return {
        network: 'unknown',
        isValid: false,
        description: 'Testnet address not allowed',
      };
    }
    return {
      network: 'bitcoin',
      isValid: true,
      description: 'Bitcoin Native SegWit address',
      metadata: {
        format: 'Native SegWit',
        isTestnet,
      },
    };
  }

  // Cosmos (check before general base58 patterns)
  if (/^(cosmos|osmo|axelar|juno|stars)[1-9a-z]{38,39}$/.test(address)) {
    const prefix = address.match(/^(cosmos|osmo|axelar|juno|stars)/)?.[0];
    return {
      network: 'cosmos',
      isValid: true,
      description: 'Cosmos ecosystem address',
      metadata: {
        chain: prefix,
        format: 'bech32',
      },
    };
  }

  // Cardano
  if (/^addr1[a-zA-Z0-9]{95,103}$/.test(address)) {
    return {
      network: 'cardano',
      isValid: true,
      description: 'Cardano address',
      metadata: {
        format: 'bech32',
        era: 'shelley',
      },
    };
  }

  // Ripple (XRP) - specific pattern to avoid conflicts
  if (/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address)) {
    return {
      network: 'ripple',
      isValid: true,
      description: 'Ripple (XRP) address',
      metadata: {
        format: 'base58',
      },
    };
  }

  // Solana - check after other base58 formats to avoid conflicts
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    // Exclude patterns that match other networks
    if (
      /^(cosmos|osmo|axelar|juno|stars|r)/.test(address) ||
      /^(1|3|bc1|tb1)/.test(address)
    ) {
      return {
        network: 'unknown',
        isValid: false,
        description: 'Invalid address format',
      };
    }
    return {
      network: 'solana',
      isValid: true,
      description: 'Solana address',
      metadata: {
        format: 'base58',
      },
    };
  }

  // Polkadot
  if (/^[1-9A-HJ-NP-Za-km-z]{47,48}$/.test(address)) {
    // Exclude patterns that match other networks
    if (/^(cosmos|osmo|axelar|juno|stars|r)/.test(address)) {
      return {
        network: 'unknown',
        isValid: false,
        description: 'Invalid address format',
      };
    }
    return {
      network: 'polkadot',
      isValid: true,
      description: 'Polkadot address',
      metadata: {
        format: 'ss58',
      },
    };
  }

  // Algorand
  if (/^[A-Z2-7]{58}$/.test(address)) {
    return {
      network: 'algorand',
      isValid: true,
      description: 'Algorand address',
      metadata: {
        format: 'base32',
      },
    };
  }

  // Stellar
  if (/^G[A-Z2-7]{55}$/.test(address)) {
    return {
      network: 'stellar',
      isValid: true,
      description: 'Stellar address',
      metadata: {
        format: 'base32',
        type: 'public',
      },
    };
  }

  // Core (ICAN)
  if (/^(cb|ce|ab)[0-9]{2}[a-f0-9]{40}$/i.test(address)) {
    const isChecksumValid = validateICANChecksum(address);
    return {
      network: 'x' + address.slice(0, 2).toLowerCase(),
      isValid: isChecksumValid,
      description:
        'ICAN address for Core blockchain networks',
      metadata: {
        isChecksumValid,
        format: 'ican',
      },
    };
  }

  // If no matches found
  return {
    network: 'unknown',
    isValid: false,
    description: 'Unknown address format',
  };
}

/**
 * Validates the checksum of an EVM address
 * @param address The EVM address to validate
 * @returns boolean indicating if the checksum is valid
 */
function validateEVMChecksum(address: string): boolean {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return false;
  }

  // If all lowercase or all uppercase, skip checksum validation
  if (address === address.toLowerCase() || address === address.toUpperCase()) {
    return true;
  }

  const stripAddress = address.slice(2).toLowerCase();
  const hash = Buffer.from(
    keccak256(Buffer.from(stripAddress, 'utf8')),
  ).toString('hex');

  for (let i = 0; i < 40; i++) {
    const hashBit = parseInt(hash[i], 16);
    if (
      (hashBit > 7 && stripAddress[i].toUpperCase() !== address[i + 2]) ||
      (hashBit <= 7 && stripAddress[i].toLowerCase() !== address[i + 2])
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Validates the checksum of an ICAN address
 * @param address The ICAN address to validate
 * @returns boolean indicating if the checksum is valid
 */
function validateICANChecksum(address: string): boolean {
  // Convert to uppercase and ensure proper format
  address = address.toUpperCase();

  // Rearrange the address: move first 4 chars to end
  const rearranged = address.slice(4) + address.slice(0, 4);

  // Convert letters to numbers (A=10, B=11, etc)
  const converted = rearranged.split('').map(char => {
    const code = char.charCodeAt(0);
    // If it's a letter (A-Z)
    if (code >= 65 && code <= 90) {
      return (code - 65 + 10).toString();
    }
    return char;
  }).join('');

  // Calculate MOD-97 of the resulting number
  let remainder = converted;
  while (remainder.length > 2) {
    const block = remainder.slice(0, 9);
    remainder = (parseInt(block, 10) % 97).toString() + remainder.slice(block.length);
  }

  // Valid ICAN addresses should have a MOD-97 result of 1
  return parseInt(remainder, 10) % 97 === 1;
}
