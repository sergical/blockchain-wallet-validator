import { keccak256 } from 'ethereum-cryptography/keccak';
import base58check from 'bs58check';

interface NetworkInfo {
  network: string;
  isValid: boolean;
  description?: string;
  metadata?: Record<string, any>;
}

interface ValidationOptions {
  network?: string; // Default: 'unknown'
  testnet?: boolean; // Default: false
  emojiAllowed?: boolean; // Default: true
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
  forceChecksumValidation: boolean = false,
): NetworkInfo {
  // Handle empty or invalid input
  if (!address || typeof address !== 'string') {
    console.log('Failed at initial input validation');
    return {
      network: 'unknown',
      isValid: false,
      description: 'Invalid input',
    };
  }

  // Modify the character validation to allow any printable characters and emojis by default
  if (!/^[\p{L}\p{N}\p{P}\p{S}\p{Emoji}]+$/u.test(address)) {
    console.log('Failed at character validation:', address);
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

    const isChecksumValid = validateEVMChecksum(
      address,
      forceChecksumValidation,
    );
    return {
      network: 'evm',
      isValid: isChecksumValid,
      description:
        'Ethereum Virtual Machine compatible address (Ethereum, Polygon, BSC, etc.)',
      metadata: {
        format: 'hex',
        isChecksumValid,
      },
    };
  }

  // Core (ICAN)
  if (/^(cb|ce|ab)[0-9]{2}[a-f0-9]{40}$/i.test(address)) {
    const isChecksumValid = validateICANChecksum(address);
    const prefix = address.slice(0, 2).toLowerCase();
    return {
      network: 'x' + prefix,
      isValid: isChecksumValid,
      description: 'ICAN address for Core blockchain networks',
      metadata: {
        format: 'ican',
        isChecksumValid,
        codename:
          prefix === 'cb'
            ? 'Mainnet'
            : prefix === 'ce'
              ? 'Koliba'
              : prefix === 'ab'
                ? 'Devin'
                : null,
        printFormat:
          address
            .toUpperCase()
            .match(/.{1,4}/g)
            ?.join('\u00A0') || address.toUpperCase(),
        electronicFormat: address.toUpperCase(),
      },
    };
  }

  // Bitcoin addresses (check before general base58 patterns)
  // Bitcoin Legacy
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
          compatibleWith: ['bitcoincash'],
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

  // Bitcoin SegWit
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

  // Bitcoin Native SegWit (bech32)
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

  // Litecoin addresses
  // Litecoin Legacy
  if (/^L[1-9A-HJ-NP-Za-km-z]{26,34}$/.test(address)) {
    try {
      base58check.decode(address);
      return {
        network: 'litecoin',
        isValid: true,
        description: 'Litecoin Legacy address',
        metadata: {
          format: 'Legacy',
          isTestnet: false,
        },
      };
    } catch {
      return {
        network: 'unknown',
        isValid: false,
        description: 'Invalid Litecoin Legacy address',
      };
    }
  }

  // Litecoin SegWit
  if (/^M[1-9A-HJ-NP-Za-km-z]{26,34}$/.test(address)) {
    try {
      base58check.decode(address);
      return {
        network: 'litecoin',
        isValid: true,
        description: 'Litecoin SegWit address',
        metadata: {
          format: 'SegWit',
          isTestnet: false,
        },
      };
    } catch {
      return {
        network: 'unknown',
        isValid: false,
        description: 'Invalid Litecoin SegWit address',
      };
    }
  }

  // Litecoin Native SegWit (bech32)
  if (/^(ltc1)[a-zA-HJ-NP-Z0-9]{25,89}$/.test(address)) {
    return {
      network: 'litecoin',
      isValid: true,
      description: 'Litecoin Native SegWit address',
      metadata: {
        format: 'Native SegWit',
        isTestnet: false,
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

  // Bitcoin Cash (CashAddr format)
  if (/^(bitcoincash:)?[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{42}$/.test(address)) {
    const addr = address.toLowerCase().replace('bitcoincash:', '');
    if (/^[qp][qpzry9x8gf2tvdw0s3jn54khce6mua7l]{41}$/.test(addr)) {
      return {
        network: 'bitcoincash',
        isValid: true,
        description: 'Bitcoin Cash CashAddr address',
        metadata: {
          format: 'CashAddr',
          isTestnet: addr.startsWith('p'),
          printFormat: `bitcoincash:${addr}`,
          electronicFormat: addr,
        },
      };
    }
  }

  // ENS Domain validation
  if (
    /^[a-zA-Z0-9-\p{Emoji_Presentation}\p{Extended_Pictographic}]+(?:\.[a-zA-Z0-9-\p{Emoji_Presentation}\p{Extended_Pictographic}]+)*\.eth$/u.test(
      address,
    )
  ) {
    // Add additional character validation
    if (/[^a-zA-Z0-9-.]/.test(address.toLowerCase())) {
      // Check if it contains emojis (which are allowed)
      const containsEmojis = /\p{Extended_Pictographic}/u.test(address);
      if (!containsEmojis || options.emojiAllowed === false) {
        return {
          network: 'unknown',
          isValid: false,
          description:
            'Invalid ENS domain format - only ASCII letters, numbers, hyphens, and emojis are allowed',
        };
      }
    }

    // Disallow consecutive dots and ensure no leading/trailing spaces
    if (address.includes('..') || address.trim() !== address) {
      return {
        network: 'unknown',
        isValid: false,
        description: 'Invalid ENS domain format',
      };
    }

    const isEmoji = /\p{Extended_Pictographic}/u.test(address);
    if (isEmoji && options.emojiAllowed === false) {
      return {
        network: 'unknown',
        isValid: false,
        description: 'Emoji characters are not allowed in ENS domains',
      };
    }

    const isSubdomain = address.split('.').length > 2;

    return {
      network: 'evm',
      isValid: true,
      description: 'Ethereum Name Service domain',
      metadata: {
        format: 'ens',
        isSubdomain,
        isEmoji,
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
function validateEVMChecksum(
  address: string,
  forceValidation: boolean = false,
): boolean {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return false;
  }

  // Skip validation for all-lowercase/uppercase unless forced
  if (
    !forceValidation &&
    (address === address.toLowerCase() || address === address.toUpperCase())
  ) {
    return true;
  }

  const stripAddress = address.slice(2);
  const addressBytes = new TextEncoder().encode(stripAddress.toLowerCase());
  const hashBytes = keccak256(addressBytes);
  const addressHash = bytesToHex(hashBytes);

  for (let i = 0; i < 40; i++) {
    const hashChar = parseInt(addressHash[i], 16);
    const addressChar = stripAddress[i];
    if (
      (hashChar > 7 && addressChar.toUpperCase() !== addressChar) ||
      (hashChar <= 7 && addressChar.toLowerCase() !== addressChar)
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
  address = address.toUpperCase();
  const rearranged = address.slice(4) + address.slice(0, 4);

  const converted = rearranged
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      return code >= 65 && code <= 90 ? (code - 65 + 10).toString() : char;
    })
    .join('');

  let remainder = converted;
  while (remainder.length > 2) {
    const block = remainder.slice(0, 9);
    remainder =
      (parseInt(block, 10) % 97).toString() + remainder.slice(block.length);
  }

  return parseInt(remainder, 10) % 97 === 1;
}
