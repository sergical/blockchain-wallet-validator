import { describe, test, expect, beforeAll } from 'vitest';
import { validateWalletAddress } from '../index';

declare module 'vitest' {
  interface Assertion<T = any> {
    toBeOneOf(array: readonly T[]): void;
  }
}

// Add custom matcher
beforeAll(() => {
  expect.extend({
    toBeOneOf(received: any, array: readonly any[]) {
      const pass = array.includes(received);
      return {
        pass,
        message: () =>
          `expected ${received} ${pass ? 'not ' : ''}to be one of ${array.join(', ')}`,
      };
    },
  });
});

describe('validateWalletAddress', () => {
  describe('EVM Addresses', () => {
    test('validates checksum EVM address', () => {
      const address = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
      const result = validateWalletAddress(address);
      expect(result.network).toBe('evm');
      expect(result.isValid).toBe(true);
      expect(result.description).toContain('Ethereum Virtual Machine');
      expect(result.metadata?.isChecksumValid).toBe(true);
    });

    test('validates lowercase EVM address', () => {
      const address = '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed';
      const result = validateWalletAddress(address);
      expect(result.network).toBe('evm');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.isChecksumValid).toBe(true);
    });

    test('invalidates incorrect checksum EVM address', () => {
      const address = '0x5AAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
      const result = validateWalletAddress(address);
      expect(result.network).toBe('evm');
      expect(result.isValid).toBe(false);
      expect(result.metadata?.isChecksumValid).toBe(false);
    });
  });

  describe('NS Domains', () => {
    test('validates simple NS domain', () => {
      const result = validateWalletAddress('vitalik.eth', {
        nsDomains: ['eth'],
      });
      expect(result.network).toBe('ns');
      expect(result.isValid).toBe(true);
      expect(result.description).toContain('Name Service domain');
      expect(result.metadata?.isSubdomain).toBe(false);
    });

    test('validates NS domain with emojis', () => {
      const validEmojiDomains = [
        '🦊.eth',
        'crypto🦊.eth',
        '🦊crypto.eth',
        'cry🦊pto.eth',
        '🦊🐻.eth',
        '🦊-crypto.eth',
      ];

      validEmojiDomains.forEach((domain) => {
        const result = validateWalletAddress(domain, {
          nsDomains: ['eth'],
        });
        expect(result.network).toBe('ns');
        expect(result.isValid).toBe(true);
        expect(result.metadata?.format).toBe('eth');
        expect(result.metadata?.isEmoji).toBe(true);
      });
    });

    test('validates NS subdomain with emojis', () => {
      const validEmojiSubdomains = [
        '🦊.vitalik.eth',
        'wallet.🦊.eth',
        '🦊.🐻.eth',
      ];

      validEmojiSubdomains.forEach((domain) => {
        const result = validateWalletAddress(domain, {
          nsDomains: ['eth'],
        });
        expect(result.network).toBe('ns');
        expect(result.isValid).toBe(true);
        expect(result.metadata?.format).toBe('eth');
        expect(result.metadata?.isSubdomain).toBe(true);
        expect(result.metadata?.isEmoji).toBe(true);
      });
    });

    test('invalidates NS domains with invalid emoji patterns', () => {
      const invalidEmojiDomains = [
        '🦊..eth', // consecutive dots
        ' 🦊.eth', // leading space
        '🦊.eth ', // trailing space
        '🦊 crypto.eth', // space in middle
        '.🦊.eth', // leading dot
        '🦊.eth.', // trailing dot
      ];

      invalidEmojiDomains.forEach((domain) => {
        const result = validateWalletAddress(domain, {
          nsDomains: ['eth'],
        });
        expect(result.isValid).toBe(false);
        expect(result.description).toMatch(
          /(Invalid NS domain format|Contains invalid characters)/,
        );
      });
    });

    test('validates NS domain with dashes', () => {
      const validDashDomains = [
        'invalid.eth',
        '-invalid.eth',
        'invalid-.eth',
        'inval-id.eth',
        '-inval-id-.eth',
        'really---long.eth',
      ];

      validDashDomains.forEach((domain) => {
        const result = validateWalletAddress(domain, {
          nsDomains: ['eth'],
        });
        expect(result.network).toBe('ns');
        expect(result.isValid).toBe(true);
        expect(result.metadata?.isSubdomain).toBe(false);
      });
    });

    test('validates NS subdomain', () => {
      const result = validateWalletAddress('wallet.vitalik.eth', {
        nsDomains: ['eth'],
      });
      expect(result.network).toBe('ns');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.isSubdomain).toBe(true);
    });

    test('validates NS subdomain with dashes', () => {
      const result = validateWalletAddress('-sub-.vit-alik.eth', {
        nsDomains: ['eth'],
      });
      expect(result.network).toBe('ns');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.isSubdomain).toBe(true);
    });
  });

  describe('Solana Addresses', () => {
    test('validates Solana address', () => {
      const result = validateWalletAddress(
        'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy',
      );
      expect(result.network).toBe('sol');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.format).toBe('base58');
    });
  });

  describe('Cosmos Addresses', () => {
    const addresses = [
      {
        addr: 'cosmos1yw6g44c4pqd2rxgrcqekxg9k8f4fd8xpx2k8c3',
        chain: 'cosmos',
      },
      { addr: 'osmo1yw6g44c4pqd2rxgrcqekxg9k8f4fd8xpabcd12', chain: 'osmo' },
      { addr: 'juno1yw6g44c4pqd2rxgrcqekxg9k8f4fd8xp123456', chain: 'juno' },
    ];

    test.each(addresses)('validates $chain address', ({ addr, chain }) => {
      const result = validateWalletAddress(addr);
      expect(result.network).toBe('atom');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.chain).toBe(chain);
      expect(result.metadata?.format).toBe('bech32');
    });
  });

  describe('Bitcoin Addresses', () => {
    const testCases = [
      {
        address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        format: 'Legacy',
      },
      {
        address: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
        format: 'SegWit',
      },
      {
        address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        format: 'Native SegWit',
      },
    ];

    test.each(testCases)(
      'validates Bitcoin $format address',
      ({ address, format }) => {
        const result = validateWalletAddress(address);
        expect(result.network).toBe('btc');
        expect(result.isValid).toBe(true);
        expect(result.metadata?.format).toBe(format);
        expect(result.metadata?.isTestnet).toBe(false);
      },
    );

    test('validates testnet address', () => {
      const result = validateWalletAddress(
        'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
        { testnet: true },
      );
      expect(result.network).toBe('btc');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.isTestnet).toBe(true);
    });
  });

  describe('Bitcoin Cash Addresses', () => {
    const testCases = [
      {
        address: '1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu',
        format: 'Legacy',
        network: 'btc',
        compatibleWith: ['bch'],
      },
      {
        address: 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a',
        format: 'CashAddr',
        network: 'bch',
        printFormat: 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a',
      },
    ];

    test.each(testCases)(
      'validates Bitcoin Cash $format address',
      ({ address, format, network, compatibleWith, printFormat }) => {
        const result = validateWalletAddress(address);
        expect(result.network).toBe(network);
        expect(result.isValid).toBe(true);
        expect(result.metadata?.format).toBe(format);

        if (compatibleWith) {
          expect(result.metadata?.compatibleWith).toEqual(
            expect.arrayContaining(compatibleWith),
          );
        }

        if (format === 'CashAddr') {
          expect(result.metadata?.printFormat).toBe(printFormat);
          expect(result.metadata?.electronicFormat).toBe(
            printFormat?.replace('bitcoincash:', ''),
          );
        }
      },
    );
  });

  describe('Litecoin Addresses', () => {
    const testCases = [
      {
        address: 'LVg2kJoFNg45Nbpy53h7Fe1wKyeXVRhMH9',
        format: 'Legacy',
      },
      {
        address: 'MADHwHmUfkY6G9soH6fDiLd1FnxGWogfSH',
        format: 'SegWit',
      },
      {
        address: 'ltc1qg42p7c3x4pddpj4efhkz0lm5g8nwh3qnz4lss9',
        format: 'Native SegWit',
      },
    ];

    test.each(testCases)(
      'validates Litecoin $format address',
      ({ address, format }) => {
        const result = validateWalletAddress(address);
        expect(result.network).toBe('ltc');
        expect(result.isValid).toBe(true);
        expect(result.metadata?.format).toBe(format);
        expect(result.metadata?.isTestnet).toBe(false);
      },
    );

    test('validates testnet address', () => {
      const result = validateWalletAddress(
        'tltc1qk2ergl0hvg8g8r89nwqjl6m6k76rgwsh95qm9d',
        { testnet: true },
      );
      expect(result.network).toBe('ltc');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.format).toBe('Native SegWit');
      expect(result.metadata?.isTestnet).toBe(true);
    });

    test('rejects testnet addresses when testnet option is false', () => {
      const address = 'tltc1qk2ergl0hvg8g8r89nwqjl6m6k76rgwsh95qm9d';
      const result = validateWalletAddress(address, { testnet: false });
      expect(result.network).toBe('ltc');
      expect(result.isValid).toBe(false);
      expect(result.description).toBe('Testnet address not allowed');
    });
  });

  describe('ICAN Format Display', () => {
    test('validates ICAN address with correct print and electronic formats', () => {
      const address = 'cb7147879011ea207df5b35a24ca6f0859dcfb145999';
      const result = validateWalletAddress(address);

      expect(result.network).toBe('xcb');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.printFormat).toBe(
        'CB71\u00A04787\u00A09011\u00A0EA20\u00A07DF5\u00A0B35A\u00A024CA\u00A06F08\u00A059DC\u00A0FB14\u00A05999',
      );
      expect(result.metadata?.electronicFormat).toBe(
        'CB7147879011EA207DF5B35A24CA6F0859DCFB145999',
      );
    });
  });

  describe('Other Networks', () => {
    test('validates Cardano address', () => {
      const result = validateWalletAddress(
        'addr1qxy8m0txfw2ng2z5wh5sps7n5r7alpx7w4l6zpxymr2myj8mmqwzf9h82zj2f9q76q2wqy572hp0pk7tnrcnx0a7esq5s7qm4',
      );
      expect(result.network).toBe('ada');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.format).toBe('bech32');
      expect(result.metadata?.era).toBe('shelley');
    });

    test('validates Polkadot address', () => {
      const result = validateWalletAddress(
        '1FRMM8PEiWXYax7rpS6X4XZX1aAAxSWx1CrKTyrVYhV24fg',
      );
      expect(result.network).toBe('dot');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.format).toBe('ss58');
    });

    test('validates Ripple address', () => {
      const result = validateWalletAddress(
        'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
      );
      expect(result.network).toBe('xrp');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.format).toBe('base58');
    });

    test('validates Algorand address', () => {
      const result = validateWalletAddress(
        'VCMJKWOY5P5P7SKMZFFOCEROPJCZOTIJMNIYNUCKH7LRO45JMJP6UYBIJA',
      );
      expect(result.network).toBe('algo');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.format).toBe('base32');
    });

    test('validates Stellar address', () => {
      const result = validateWalletAddress(
        'GBQMXVTR5HQNRGXPR4ZPBOZR7VQXOQMEQMZWIVLIW2MYBXC2HQWZZ4VJ',
      );
      expect(result.network).toBe('xlm');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.format).toBe('base32');
      expect(result.metadata?.type).toBe('public');
    });
  });

  describe('Invalid Addresses', () => {
    test('handles invalid addresses', () => {
      const possibleNetworks = [
        'evm',
        'ns',
        'sol',
        'atom',
        'btc',
        'ltc',
        'ada',
        'dot',
        'xrp',
        'algo',
        'xlm',
        'xcb',
        'xce',
        'xab',
        null
      ] as const;

      const invalidAddresses = [
        // Empty values
        '',
        '   ',
        null,
        undefined,

        // Invalid EVM addresses
        '0x123', // too short
        '0xG4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97', // invalid hex
        '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f9', // too short
        '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f977', // too long

        // Invalid ENS domains
        '.eth',
        'eth',
        'invalid.',
        'invalid..eth',
        'inv*alid.eth',
        'inv@lid.eth',
        '.invalid.eth',

        // Invalid Bitcoin addresses
        '1', // too short
        '3', // too short
        'bc1', // too short
        '1InvalidBitcoinAddress',
        '3InvalidSegWitAddress',
        'bc1InvalidNativeSegWit',
        'tb1InvalidTestnetAddress',

        // Invalid Cosmos addresses
        'cosmos', // too short
        'osmoinvalid',
        'junoinvalidaddress',
        'cosmos1invalid!address',

        // Invalid Solana addresses
        'InvalidSolanaAddress',
        'Too$hort',
        'Contains!Invalid@Characters',

        // Invalid Cardano addresses
        'addr1', // too short
        'addr1invalidaddress',
        'addr2invalidprefix',

        // Invalid Polkadot addresses
        'InvalidPolkadotAddress',
        '1FRMM8!InvalidChars',

        // Invalid Ripple addresses
        'r', // too short
        'rInvalidRippleAddress',
        'sWrongPrefix',

        // Invalid Algorand addresses
        'INVALIDALGORANDADDRESS',
        'WRONG*CHARS',

        // Invalid Stellar addresses
        'G', // too short
        'GInvalidStellarAddress',
        'MWrongPrefix',

        // Random strings
        '1234567890',
        'not-an-address',
        'random.string',
        'test@example.com',
        'https://example.com',
        '<script>alert("test")</script>',
        '{"key": "value"}',
        '[1,2,3]',
      ];

      invalidAddresses.forEach((address: any) => {
        const result = validateWalletAddress(address, { testnet: true, enabledLegacy: true, nsDomains: ['eth'] });
        try {
          expect(result.network).toBeOneOf(possibleNetworks);
          expect(result.isValid).toBe(false);
        } catch (error) {
          console.log(`Failed validation for address: "${address}"`);
          console.log('Result:', result);
          throw error;
        }
      });
    });

    test('handles whitespace in addresses', () => {
      const addressWithSpace = '0x6B175474E89094C44Da98b954 EedeAC495271d0F';
      const result = validateWalletAddress(addressWithSpace);
      expect(result.network).toBe('evm');
      expect(result.isValid).toBe(false);
      expect(result.description).toBe('Invalid EVM address format');
    });
  });

  describe('ICAN Addresses', () => {
    const validAddresses = [
      {
        address: 'cb7147879011ea207df5b35a24ca6f0859dcfb145999',
        network: 'xcb',
        description: 'Core blockchain mainnet',
        printFormat:
          'CB71\u00A04787\u00A09011\u00A0EA20\u00A07DF5\u00A0B35A\u00A024CA\u00A06F08\u00A059DC\u00A0FB14\u00A05999',
        electronicFormat: 'CB7147879011EA207DF5B35A24CA6F0859DCFB145999',
      },
      {
        address: 'ce450000000000000000000000000000000000000000',
        network: 'xce',
        description: 'Core blockchain enterprise',
        printFormat:
          'CE45\u00A00000\u00A00000\u00A00000\u00A00000\u00A00000\u00A00000\u00A00000\u00A00000\u00A00000\u00A00000',
        electronicFormat: 'CE450000000000000000000000000000000000000000',
      },
      {
        address: 'ab792215c43fc213c02182c8389f2bc32408e2c50922',
        network: 'xab',
        description: 'Core blockchain testnet',
        printFormat:
          'AB79\u00A02215\u00A0C43F\u00A0C213\u00A0C021\u00A082C8\u00A0389F\u00A02BC3\u00A02408\u00A0E2C5\u00A00922',
        electronicFormat: 'AB792215C43FC213C02182C8389F2BC32408E2C50922',
      },
    ];

    test.each(validAddresses)(
      'validates $description address with correct formats',
      ({ address, network, printFormat, electronicFormat }) => {
        const result = validateWalletAddress(address, { testnet: true });
        expect(result.network).toBe(network);
        expect(result.isValid).toBe(true);
        expect(result.description).toContain('ICAN address');
        expect(result.metadata?.format).toBe('ican');
        expect(result.metadata?.printFormat).toBe(printFormat);
        expect(result.metadata?.electronicFormat).toBe(electronicFormat);
      },
    );

    test('handles case insensitivity while maintaining correct formats', () => {
      const address = 'cb7147879011ea207df5b35a24ca6f0859dcfb145999';
      const expectedPrint =
        'CB71\u00A04787\u00A09011\u00A0EA20\u00A07DF5\u00A0B35A\u00A024CA\u00A06F08\u00A059DC\u00A0FB14\u00A05999';
      const expectedElectronic = 'CB7147879011EA207DF5B35A24CA6F0859DCFB145999';

      // Test lowercase input
      const lowerResult = validateWalletAddress(address.toLowerCase());
      expect(lowerResult.isValid).toBe(true);
      expect(lowerResult.metadata?.printFormat).toBe(expectedPrint);
      expect(lowerResult.metadata?.electronicFormat).toBe(expectedElectronic);

      // Test uppercase input
      const upperResult = validateWalletAddress(address.toUpperCase());
      expect(upperResult.isValid).toBe(true);
      expect(upperResult.metadata?.printFormat).toBe(expectedPrint);
      expect(upperResult.metadata?.electronicFormat).toBe(expectedElectronic);

      // Test mixed case input
      const mixedResult = validateWalletAddress(
        'cB7147879011eA207df5b35a24ca6f0859dcfb145999',
      );
      expect(mixedResult.isValid).toBe(true);
      expect(mixedResult.metadata?.printFormat).toBe(expectedPrint);
      expect(mixedResult.metadata?.electronicFormat).toBe(expectedElectronic);
    });

    test('invalidates addresses with incorrect checksums', () => {
      const invalidChecksums = [
        'cb7147879011ea207df5b35a24ca6f0859dcfb145990', // changed last digit
        'ce450000000000000000000000000000000000000001', // changed last digit
        'ab792215c43fc213c02182c8389f2bc32408e2c50921', // changed last digit
      ];

      invalidChecksums.forEach((address) => {
        const result = validateWalletAddress(address, { testnet: true });
        expect(result.isValid).toBe(false);
      });
    });

    test('invalidates addresses with incorrect length', () => {
      const invalidLengths = [
        'cb7147', // too short
        'ce45000000000000000000000000000000000000000000', // too long
        'ab', // too short
      ];

      invalidLengths.forEach((address) => {
        const result = validateWalletAddress(address, { testnet: true });
        expect(result.isValid).toBe(false);
        expect(result.description).toContain('Unknown address format');
      });
    });

    test('invalidates addresses with invalid characters', () => {
      const invalidCharacters = [
        'cbG147879011ea207df5b35a24ca6f0859dcfb145999', // G is not hex
        'ce45000000000000000000000000000000000000000g', // g is not hex
        'ab79221$c43fc213c02182c8389f2bc32408e2c50922', // $ is not hex
      ];

      invalidCharacters.forEach((address) => {
        const result = validateWalletAddress(address, { testnet: true });
        expect(result.isValid).toBe(false);
        expect(result.description).toMatch(
          /(Unknown address format|Contains invalid characters)/,
        );
      });
    });

    test('invalidates addresses with invalid prefixes', () => {
      const invalidPrefixes = [
        'cc7147879011ea207df5b35a24ca6f0859dcfb145999', // cc is not valid
        'cf450000000000000000000000000000000000000000', // cf is not valid
        'ac792215c43fc213c02182c8389f2bc32408e2c50922', // ac is not valid
      ];

      invalidPrefixes.forEach((address) => {
        const result = validateWalletAddress(address, { testnet: true });
        expect(result.network).toBe(null);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('Browser Compatibility', () => {
    test('validates EVM addresses without requiring Buffer', () => {
      // Save original Buffer if it exists
      const originalBuffer = global.Buffer;
      // @ts-expect-error Intentionally removing Buffer to test browser compatibility
      delete global.Buffer;

      try {
        // Test checksum address
        const checksumResult = validateWalletAddress(
          '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97',
        );
        expect(checksumResult.network).toBe('evm');
        expect(checksumResult.isValid).toBe(true);

        // Test lowercase address
        const lowercaseResult = validateWalletAddress(
          '0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97',
        );
        expect(lowercaseResult.network).toBe('evm');
        expect(lowercaseResult.isValid).toBe(true);

        // Test invalid checksum
        const invalidResult = validateWalletAddress(
          '0x4838B106FCE9647BDF1E7877BF73CE8B0BAD5F97',
        );
        expect(invalidResult.network).toBe('evm');
        expect(invalidResult.isValid).toBe(false);
      } finally {
        // Restore Buffer
        global.Buffer = originalBuffer;
      }
    });

    test('validates Bitcoin addresses without requiring Buffer', () => {
      const originalBuffer = global.Buffer;
      // @ts-expect-error Intentionally removing Buffer to test browser compatibility
      delete global.Buffer;

      try {
        const result = validateWalletAddress(
          '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        );
        expect(result.network).toBe('btc');
        expect(result.isValid).toBe(true);
      } finally {
        global.Buffer = originalBuffer;
      }
    });

    test('validates all address types without Buffer dependency', () => {
      const originalBuffer = global.Buffer;
      // @ts-expect-error Intentionally removing Buffer to test browser compatibility
      delete global.Buffer;

      try {
        const testAddresses = [
          // NS domains
          'vitalik.eth',
          'wallet.vitalik.eth',

          // Cosmos addresses
          'cosmos1yw6g44c4pqd2rxgrcqekxg9k8f4fd8xpx2k8c3',

          // Solana address
          'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy',

          // ICAN address
          'cb7147879011ea207df5b35a24ca6f0859dcfb145999',

          // Other network addresses
          'addr1qxy8m0txfw2ng2z5wh5sps7n5r7alpx7w4l6zpxymr2myj8mmqwzf9h82zj2f9q76q2wqy572hp0pk7tnrcnx0a7esq5s7qm4', // Cardano
          'GBQMXVTR5HQNRGXPR4ZPBOZR7VQXOQMEQMZWIVLIW2MYBXC2HQWZZ4VJ', // Stellar
        ];

        testAddresses.forEach((address) => {
          const result = validateWalletAddress(address);
          expect(result.isValid).toBe(true);
          expect(result.network).not.toBe(null);
        });
      } finally {
        global.Buffer = originalBuffer;
      }
    });
  });

  describe('Error Cases and Edge Cases', () => {
    describe('ICAN Addresses', () => {
      test('handles unknown ICAN network prefix', () => {
        const address = 'cd7147879011ea207df5b35a24ca6f0859dcfb145999';
        const result = validateWalletAddress(address);
        expect(result.network).toBe(null);
        expect(result.isValid).toBe(false);
        expect(result.metadata?.codename).toBe(undefined);
      });
    });

    describe('Bitcoin Network Errors', () => {
      test('handles invalid Bitcoin Legacy address format', () => {
        const address = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN3';
        const result = validateWalletAddress(address);
        expect(result.network).toBe('btc');
        expect(result.isValid).toBe(false);
        expect(result.description).toBe('Invalid Bitcoin Legacy address');
      });

      test('handles invalid Bitcoin SegWit address format', () => {
        const address = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLx';
        const result = validateWalletAddress(address);
        expect(result.network).toBe('btc');
        expect(result.isValid).toBe(false);
        expect(result.description).toBe('Invalid Bitcoin SegWit address');
      });

      test('rejects testnet addresses when testnet option is false', () => {
        const address = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';
        const result = validateWalletAddress(address, { testnet: false });
        expect(result.network).toBe('btc');
        expect(result.isValid).toBe(false);
        expect(result.description).toBe('Testnet address not allowed');
      });
    });

    describe('Litecoin Network Errors', () => {
      test('handles invalid Litecoin Legacy address format', () => {
        const address = 'LVg2kJoFNg45Nbpy53h7Fe1wKyeXVRhMH8';
        const result = validateWalletAddress(address);
        expect(result.network).toBe('ltc');
        expect(result.isValid).toBe(false);
        expect(result.description).toBe('Invalid Litecoin Legacy address');
      });

      test('handles invalid Litecoin SegWit address format', () => {
        const address = 'MADHwHmUfkY6G9soH6fDiLd1FnxGWogfSK';
        const result = validateWalletAddress(address);
        expect(result.network).toBe('ltc');
        expect(result.isValid).toBe(false);
        expect(result.description).toBe('Invalid Litecoin SegWit address');
      });
    });

    describe('Address Format Conflicts', () => {
      test('handles Solana address pattern conflicts', () => {
        const addresses = [
          'cosmos1nvalidaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          'osmo1nvalidaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          'axelar1nvalidaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          'juno1nvalidaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          'stars1nvalidaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          'r1nvalidaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          '1nvalidaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          '3nvalidaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          'bc1nvalidaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          'tb1nvalidaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        ];

        addresses.forEach((address) => {
          const result = validateWalletAddress(address);
          expect(result.network).toBe('sol');
          expect(result.isValid).toBe(false);
          expect(result.description).toBe('Invalid address format');
        });
      });

      test('handles Polkadot address pattern conflicts', () => {
        const addresses = [
          'cosmos1invalidpolkadotaddress',
          'osmo1invalidpolkadotaddress',
          'axelar1invalidpolkadotaddress',
          'juno1invalidpolkadotaddress',
          'stars1invalidpolkadotaddress',
          'r1invalidpolkadotaddress',
        ];

        addresses.forEach((address) => {
          const result = validateWalletAddress(address);
          expect(result.network).toBe('dot');
          expect(result.isValid).toBe(false);
          expect(result.description).toBe('Invalid address format');
        });
      });
    });

    describe('NS Domain Validation Errors', () => {
      test('rejects NS domains with invalid characters when not emoji', () => {
        const address = 'invalid@domain.eth';
        const result = validateWalletAddress(address);
        expect(result.network).toBe('ns');
        expect(result.isValid).toBe(false);
        expect(result.description).toBe(
          'Invalid NS domain format - only ASCII letters, numbers, hyphens, and emojis are allowed',
        );
      });

      test('rejects NS domains with invalid format', () => {
        const invalidFormats = [
          '..eth',
          'domain..eth',
          ' domain.eth',
          'domain.eth ',
          'domain..eth',
        ];

        invalidFormats.forEach((domain) => {
          const result = validateWalletAddress(domain, { nsDomains: ['eth'] });
          expect(result.network).toBe('ns');
          expect(result.isValid).toBe(false);
          expect(result.description).toBe('Invalid NS domain format');
        });
      });

      test('rejects NS domains with emojis when emojis are not allowed', () => {
        const address = '🦊.eth';
        const result = validateWalletAddress(address, { nsDomains: ['eth'], emojiAllowed: false });
        expect(result.network).toBe('ns');
        expect(result.isValid).toBe(false);
        expect(result.description).toBe(
          'Emoji characters are not allowed in NS domains',
        );
      });
    });

    describe('EVM Checksum Validation', () => {
      test('handles invalid EVM address format in checksum validation', () => {
        const address = '0xinvalid';
        const result = validateWalletAddress(address);
        expect(result.network).toBe('evm');
        expect(result.isValid).toBe(false);
        expect(result.description).toBe('Invalid EVM address format');
      });
    });
  });
});
