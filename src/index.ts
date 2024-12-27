import { keccak256 } from 'ethereum-cryptography/keccak';
import base58check from 'bs58check';

interface NetworkInfo {
  network: string | null;
  isValid: boolean;
  description?: string;
  metadata?: Record<string, any>;
}

interface ValidationOptions {
  network?: string[] | null; // Default: null (no exclusion); string[] (check only these networks)
  testnet?: boolean; // Default: false
  enabledLegacy?: boolean; // Default: true
  emojiAllowed?: boolean; // Default: true
  nsDomains?: string[]; // Default: []
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Browser-compatible validation patterns
const patterns = {
  evm: /^0x[a-f0-9]{40}$/i,
  atom: /^(cosmos|osmo|axelar|juno|stars)1[a-zA-Z0-9]{38}$/,
  sol: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  ada: {
    mainnet: /^addr1[a-z0-9]{98}$/,
    testnet: /^addr_test1[a-z0-9]{98}$/,
    stake: /^stake1[a-z0-9]{53}$/,
    stakeTestnet: /^stake_test1[a-z0-9]{53}$/,
  },
  algo: /^[A-Z2-7]{58}$/,
  xlm: /^G[A-Z2-7]{55}$/,
  ican: /^(cb|ce|ab)[0-9]{2}[a-f0-9]{40}$/i,
  dot: /^[1-9A-HJ-NP-Za-km-z]{47,48}$/,
  btc: {
    legacy: /^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
    segwit: /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
    nativeSegwit: /^(bc1|tb1)[a-zA-HJ-NP-Z0-9]{25,89}$/,
  },
  ltc: {
    legacy: /^L[1-9A-HJ-NP-Za-km-z]{26,34}$/,
    segwit: /^M[1-9A-HJ-NP-Za-km-z]{26,34}$/,
    nativeSegwit: /^(ltc1|tltc1)[a-zA-HJ-NP-Z0-9]{25,89}$/,
  },
  xrp: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/,
  bch: {
    cashAddr: /^(bitcoincash:)?[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{42}$/,
    address: /^[qp][qpzry9x8gf2tvdw0s3jn54khce6mua7l]{41}$/,
  },
};

/**
 * Validates a blockchain wallet address and returns information about the network it belongs to
 * @param address The wallet address to validate
 * @param options Optional validation options
 * @returns NetworkInfo object containing validation results
 */
export function validateWalletAddress(
  address: string,
  options: ValidationOptions = {
    network: null,
    testnet: false,
    enabledLegacy: true,
    emojiAllowed: true,
    nsDomains: [],
  },
  forceChecksumValidation: boolean = false,
): NetworkInfo {
  // Add this line near the start of the function to ensure nsDomains exists
  const nsDomains = options.nsDomains ?? [];
  const allowedNetworks = options.network ?? [];

  // Handle empty or invalid input
  if (!address || typeof address !== 'string') {
    return {
      network: null,
      isValid: false,
      description: 'Invalid input',
    };
  }

  // For browser compatibility, we need to handle Buffer-less validation
  try {
    // NS Domain validation (check before other validations)
    if (nsDomains.length > 0) {
      // Only check if nsDomains are provided
      // Trim the address and remove trailing dots for domain matching
      const addressForMatching = address
        .trim()
        .replace(/\.+$/, '')
        .toLowerCase();
      const matchedDomain = nsDomains.find((domain) =>
        addressForMatching.endsWith('.' + domain.toLowerCase()),
      );

      if (matchedDomain) {
        const baseResponse = {
          network: 'ns' as const,
          isValid: false,
          description: 'Invalid NS domain format',
        };

        // First check for basic format issues (spaces, dots)
        if (
          address !== address.trim() || // has leading/trailing spaces
          address.includes('..') || // has consecutive dots
          /\s/.test(address) || // has spaces anywhere
          address.startsWith('.') || // starts with dot
          address.endsWith('.')
        ) {
          // ends with dot
          return {
            ...baseResponse,
            description: 'Invalid NS domain format',
          };
        }

        // Check for invalid characters (but allow emojis)
        const validPattern =
          /^[a-zA-Z0-9-\p{Emoji_Presentation}\p{Extended_Pictographic}]+(?:\.[a-zA-Z0-9-\p{Emoji_Presentation}\p{Extended_Pictographic}]+)*\.[a-zA-Z]+$/u;
        if (!validPattern.test(address)) {
          // For any format issues, keep the message simple
          return {
            ...baseResponse,
            description: 'Invalid NS domain format',
          };
        }

        // Check emoji allowance
        const containsEmojis = /\p{Extended_Pictographic}/u.test(address);
        if (containsEmojis && options.emojiAllowed === false) {
          return {
            ...baseResponse,
            description: 'Emoji characters are disabled in NS domains',
          };
        }

        // If we get here, the domain is valid
        const isSubdomain = address.split('.').length > 2;

        return {
          network: 'ns',
          isValid: true,
          description: 'Name Service domain',
          metadata: {
            format: matchedDomain,
            isSubdomain,
            isEmoji: containsEmojis,
          },
        };
      }
    }

    // Try standard validation first
    // Handle EVM-like addresses first (including invalid ones)
    if (
      address.toLowerCase().startsWith('0x') &&
      enabledNetwork(['evm', 'eth', 'base', 'pol'], allowedNetworks)
    ) {
      // Check for exact length and valid hex characters
      if (!patterns.evm.test(address)) {
        return {
          network: 'evm',
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
    if (
      enabledNetwork(['ican', 'xcb', 'xce', 'xab'], allowedNetworks) &&
      patterns.ican.test(address)
    ) {
      const isTestnet = address.startsWith('ab');
      if (isTestnet && !options.testnet) {
        return {
          network: 'xab',
          isValid: false,
          description: 'Testnet address not allowed',
        };
      }
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
                  : undefined,
          isTestnet,
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
    if (enabledNetwork(['btc'], allowedNetworks)) {
      // Bitcoin Legacy
      if (options.enabledLegacy && patterns.btc.legacy.test(address)) {
        try {
          base58check.decode(address);
          return {
            network: 'btc',
            isValid: true,
            description: 'Bitcoin Legacy address',
            metadata: {
              format: 'Legacy',
              isTestnet: false,
              compatibleWith: ['bch'],
            },
          };
        } catch {
          return {
            network: 'btc',
            isValid: false,
            description: 'Invalid Bitcoin Legacy address',
          };
        }
      }

      // Bitcoin SegWit
      if (patterns.btc.segwit.test(address)) {
        try {
          base58check.decode(address);
          return {
            network: 'btc',
            isValid: true,
            description: 'Bitcoin SegWit address',
            metadata: {
              format: 'SegWit',
              isTestnet: false,
            },
          };
        } catch {
          return {
            network: 'btc',
            isValid: false,
            description: 'Invalid Bitcoin SegWit address',
          };
        }
      }

      // Bitcoin Native SegWit (bech32)
      if (patterns.btc.nativeSegwit.test(address)) {
        const isTestnet = address.startsWith('tb1');
        if (isTestnet && !options.testnet) {
          return {
            network: 'btc',
            isValid: false,
            description: 'Testnet address not allowed',
          };
        }
        return {
          network: 'btc',
          isValid: true,
          description: 'Bitcoin Native SegWit address',
          metadata: {
            format: 'Native SegWit',
            isTestnet,
          },
        };
      }
    }

    // Litecoin addresses
    if (enabledNetwork(['ltc'], allowedNetworks)) {
      // Litecoin Legacy
      if (options.enabledLegacy && patterns.ltc.legacy.test(address)) {
        try {
          base58check.decode(address);
          return {
            network: 'ltc',
            isValid: true,
            description: 'Litecoin Legacy address',
            metadata: {
              format: 'Legacy',
              isTestnet: false,
            },
          };
        } catch {
          return {
            network: 'ltc',
            isValid: false,
            description: 'Invalid Litecoin Legacy address',
          };
        }
      }

      // Litecoin SegWit
      if (patterns.ltc.segwit.test(address)) {
        try {
          base58check.decode(address);
          return {
            network: 'ltc',
            isValid: true,
            description: 'Litecoin SegWit address',
            metadata: {
              format: 'SegWit',
              isTestnet: false,
            },
          };
        } catch {
          return {
            network: 'ltc',
            isValid: false,
            description: 'Invalid Litecoin SegWit address',
          };
        }
      }

      // Litecoin Native SegWit (bech32)
      if (patterns.ltc.nativeSegwit.test(address)) {
        const isTestnet = address.startsWith('tltc1');
        if (isTestnet && !options.testnet) {
          return {
            network: 'ltc',
            isValid: false,
            description: 'Testnet address not allowed',
          };
        }
        return {
          network: 'ltc',
          isValid: true,
          description: 'Litecoin Native SegWit address',
          metadata: {
            format: 'Native SegWit',
            isTestnet,
          },
        };
      }
    }

    // Cosmos (check before general base58 patterns)
    if (enabledNetwork(['atom'], allowedNetworks)) {
      const cosmosMatch = address.match(patterns.atom);
      if (cosmosMatch) {
        const prefix = cosmosMatch[1]; // Gets the captured group (cosmos|osmo|axelar|juno|stars)
        return {
          network: 'atom',
          isValid: true,
          description: 'Cosmos ecosystem address',
          metadata: {
            chain: prefix,
            format: 'bech32',
          },
        };
      }
    }

    // Cardano
    if (enabledNetwork(['ada'], allowedNetworks)) {
      // Shelley mainnet
      if (patterns.ada.mainnet.test(address)) {
        return {
          network: 'ada',
          isValid: true,
          description: 'Cardano Shelley mainnet address',
          metadata: {
            format: 'bech32',
            era: 'shelley',
            type: 'payment',
            isTestnet: false,
          },
        };
      }

      // Shelley testnet
      if (patterns.ada.testnet.test(address)) {
        if (!options.testnet) {
          return {
            network: 'ada',
            isValid: false,
            description: 'Testnet address not allowed',
          };
        }
        return {
          network: 'ada',
          isValid: true,
          description: 'Cardano Shelley testnet address',
          metadata: {
            format: 'bech32',
            era: 'shelley',
            type: 'payment',
            isTestnet: true,
          },
        };
      }

      // Stake address mainnet
      if (patterns.ada.stake.test(address)) {
        return {
          network: 'ada',
          isValid: true,
          description: 'Cardano stake address',
          metadata: {
            format: 'bech32',
            era: 'shelley',
            type: 'stake',
            isTestnet: false,
          },
        };
      }

      // Stake address testnet
      if (patterns.ada.stakeTestnet.test(address)) {
        if (!options.testnet) {
          return {
            network: 'ada',
            isValid: false,
            description: 'Testnet address not allowed',
          };
        }
        return {
          network: 'ada',
          isValid: true,
          description: 'Cardano stake testnet address',
          metadata: {
            format: 'bech32',
            era: 'shelley',
            type: 'stake',
            isTestnet: true,
          },
        };
      }

      // Invalid format check
      if (/^(addr1|addr_test1|stake1|stake_test1)/.test(address)) {
        return {
          network: 'ada',
          isValid: false,
          description: 'Invalid Cardano address format',
        };
      }
    }

    // Ripple (XRP) - specific pattern to avoid conflicts
    if (enabledNetwork(['xrp'], allowedNetworks)) {
      // Mainnet addresses start with 'r'
      if (patterns.xrp.test(address)) {
        return {
          network: 'xrp',
          isValid: true,
          description: 'Ripple address',
          metadata: {
            format: 'base58',
            isTestnet: false,
          },
        };
      }
    }

    // Solana - check after other base58 formats to avoid conflicts
    if (enabledNetwork(['sol'], allowedNetworks)) {
      // First check if it matches the basic Solana pattern
      if (patterns.sol.test(address)) {
        // Then check for conflicts
        if (
          /^(cosmos|osmo|axelar|juno|stars|r|bc1|tb1|ltc1|tltc1)/.test(address)
        ) {
          return {
            network: 'sol',
            isValid: false,
            description: 'Invalid address format',
          };
        }
        return {
          network: 'sol',
          isValid: true,
          description: 'Solana address',
          metadata: {
            format: 'base58',
            isTestnet: options.testnet || false,
          },
        };
      }
    }

    // Polkadot
    if (enabledNetwork(['dot'], allowedNetworks)) {
      // First check if it matches the basic Polkadot pattern
      if (patterns.dot.test(address)) {
        // Then check for conflicts
        if (
          /^(cosmos|osmo|axelar|juno|stars|r|bc1|tb1|ltc1|tltc1)/.test(address)
        ) {
          return {
            network: 'dot',
            isValid: false,
            description: 'Invalid address format',
          };
        }
        return {
          network: 'dot',
          isValid: true,
          description: 'Polkadot address',
          metadata: {
            format: 'ss58',
            isTestnet: options.testnet || false,
          },
        };
      }
    }

    // Algorand
    if (
      enabledNetwork(['algo'], allowedNetworks) &&
      patterns.algo.test(address)
    ) {
      return {
        network: 'algo',
        isValid: true,
        description: 'Algorand address',
        metadata: {
          format: 'base32',
        },
      };
    }

    // Stellar
    if (
      enabledNetwork(['xlm'], allowedNetworks) &&
      patterns.xlm.test(address)
    ) {
      return {
        network: 'xlm',
        isValid: true,
        description: 'Stellar address',
        metadata: {
          format: 'base32',
          type: 'public',
        },
      };
    }

    // Bitcoin Cash (CashAddr format)
    if (
      enabledNetwork(['bch'], allowedNetworks) &&
      patterns.bch.cashAddr.test(address)
    ) {
      const addr = address.toLowerCase().replace('bitcoincash:', '');
      if (patterns.bch.address.test(addr)) {
        return {
          network: 'bch',
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

    // If no matches found
    return {
      network: null,
      isValid: false,
      description: 'Unknown address format',
    };
  } catch (error) {
    // If Buffer is not available or other errors occur
    // Fall back to basic pattern matching
    return {
      network: null,
      isValid: false,
      description: 'Validation failed: ' + (error as Error).message,
    };
  }
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

/**
 * Checks if a network is enabled
 * @param networks The list of networks to check
 * @param allowedNetworks The list of allowed networks
 * @returns boolean indicating if the network is enabled
 */
function enabledNetwork(
  networks: string[],
  allowedNetworks: string[],
): boolean {
  if (allowedNetworks.length === 0) {
    return true;
  }
  for (const network of networks) {
    if (allowedNetworks.includes(network)) {
      return true;
    }
  }
  return false;
}
