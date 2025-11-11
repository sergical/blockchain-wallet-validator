import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';
import { validateEVMChecksum, validateWalletAddress } from '../index';

declare module 'vitest' {
  interface Assertion<T = any> {
    toBeOneOf(array: readonly T[]): void;
  }
}

// Add custom matcher
beforeAll(() => {
  expect.extend({
    toBeOneOf(received, array) {
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
  describe('Custom Matcher', () => {
    test('toBeOneOf matcher works correctly', () => {
      const testValue = 'test';
      const validArray = ['test', 'other'];
      const invalidArray = ['other', 'another'];

      expect(testValue).toBeOneOf(validArray);
      expect(() => expect(testValue).toBeOneOf(invalidArray)).toThrow();
    });
  });

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
        expect(result.network).toBe('ns');
        expect(result.isValid).toBe(false);
        expect(result.description).toBe('Invalid NS domain format');
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

    test('handles NS domains with labels exceeding 63 characters', () => {
      const tooLongLabel = 'a'.repeat(64); // Exceeds maximum length for a DNS label
      const domains = [
        `${tooLongLabel}.eth`, // Label too long (64 chars)
        `sub.${tooLongLabel}.eth`, // Label too long in subdomain
      ];

      domains.forEach((domain) => {
        const result = validateWalletAddress(domain, { nsDomains: ['eth'] });
        expect(result.network).toBe('ns');
        expect(result.isValid).toBe(false);
        expect(result.description).toBe(
          'NS domain label exceeds maximum length of 63 characters',
        );
      });
    });

    test('handles NS domains exceeding total length of 255 characters', () => {
      const longButValidLabel = 'a'.repeat(63); // Maximum valid label length
      const tooLongTotal = Array(5).fill(longButValidLabel).join('.'); // Creates a very long domain with dots

      const result = validateWalletAddress(`${tooLongTotal}.eth`, {
        nsDomains: ['eth'],
      });
      expect(result.network).toBe('ns');
      expect(result.isValid).toBe(false);
      expect(result.description).toBe(
        'NS domain exceeds maximum total length of 255 characters',
      );
    });

    test('applies custom max label length per domain', () => {
      const result = validateWalletAddress('toolong.eth', {
        nsDomains: [{ domain: 'eth', maxLabelLength: 4 }],
      });
      expect(result.network).toBe('ns');
      expect(result.isValid).toBe(false);
      expect(result.description).toBe(
        'NS domain label exceeds maximum length of 4 characters',
      );
    });

    test('applies custom max total length per domain', () => {
      const result = validateWalletAddress('reallylongdomain.eth', {
        nsDomains: [{ domain: 'eth', maxTotalLength: 10 }],
      });
      expect(result.network).toBe('ns');
      expect(result.isValid).toBe(false);
      expect(result.description).toBe(
        'NS domain exceeds maximum total length of 10 characters',
      );
    });

    test('allows domain-specific emoji flag override', () => {
      const disabledEmojiResult = validateWalletAddress('🦊.eth', {
        nsDomains: [{ domain: 'eth', emojiAllowed: false }],
      });
      expect(disabledEmojiResult.network).toBe('ns');
      expect(disabledEmojiResult.isValid).toBe(false);
      expect(disabledEmojiResult.description).toBe(
        'Emoji characters are disabled for NS domain eth',
      );

      const enabledEmojiResult = validateWalletAddress('🦊.eth', {
        emojiAllowed: false,
        nsDomains: [{ domain: 'eth', emojiAllowed: true }],
      });
      expect(enabledEmojiResult.network).toBe('ns');
      expect(enabledEmojiResult.isValid).toBe(true);
      expect(enabledEmojiResult.metadata?.isEmoji).toBe(true);
      expect(enabledEmojiResult.metadata?.emojiAllowed).toBe(true);
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

    test('rejects Solana-like address with conflicting prefix', () => {
      const conflictingAddress = 'r' + '1'.repeat(33);
      const result = validateWalletAddress(conflictingAddress, {
        network: ['sol'],
      });
      expect(result.network).toBe('sol');
      expect(result.isValid).toBe(false);
      expect(result.description).toBe('Invalid address format');
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
        'addr1qythpnvgh8cptwjremjyhtu9s8hjhumhl394uu8kj8g0e8zccjv53fguu9z3xst5md4np534fy0r6t3ad5p7e63qa0ks5j9yky',
      );
      expect(result.network).toBe('ada');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.format).toBe('bech32');
      expect(result.metadata?.era).toBe('shelley');
    });

    test('validates Polkadot address', () => {
      const result = validateWalletAddress(
        '14ha4TkKnHmmYQeFaFw8um5vx5WgA5pjjcg4b9JjB6HXMdiu',
      );
      expect(result.network).toBe('dot');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.format).toBe('ss58');
    });

    test('rejects Polkadot-like address with conflicting prefix', () => {
      const conflictingAddress = 'cosmos' + '1'.repeat(41);
      const result = validateWalletAddress(conflictingAddress, {
        network: ['dot'],
      });
      expect(result.network).toBe('dot');
      expect(result.isValid).toBe(false);
      expect(result.description).toBe('Invalid address format');
    });

    test('validates Ripple address', () => {
      const result = validateWalletAddress(
        'r9qhsH6xHyKAjGhgA9anpWJJmVDAwDGfn6',
      );
      expect(result.network).toBe('xrp');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.format).toBe('base58');
    });

    test('validates Algorand address', () => {
      const result = validateWalletAddress(
        '2OLDYPKUOPFN6ZEQ3ULYSNEQZIK7FQYCL34LOGH3TXSSQOC272VB7JWNMQ',
      );
      expect(result.network).toBe('algo');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.format).toBe('base32');
    });

    test('validates Stellar address', () => {
      const result = validateWalletAddress(
        'GAKS5NRNURVDK6WKLEEFPEUB3C5H3VPURL26PVQ3EPIYJT2B35NMAZHA',
      );
      expect(result.network).toBe('xlm');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.format).toBe('base32');
      expect(result.metadata?.type).toBe('public');
    });

    describe('Tron Addresses', () => {
      test('validates Tron address', () => {
        const validAddresses = [
          'TRWBqiqoFZysoAeyR1J35ibuyc8EvhUAoY',
          'TNPeeaaFB7K9cmo4uQpcU32zHq5ApCJHsS',
          'TDGmmTC7xDgQGwH4FYRGuE7SqN8DkACVnX',
        ];

        validAddresses.forEach((address) => {
          const result = validateWalletAddress(address, {
            network: ['trx', 'tron'],
          });
          expect(result.network).toBe('trx');
          expect(result.isValid).toBe(true);
          expect(result.description).toBe('Tron address');
          expect(result.metadata?.format).toBe('base58');
        });
      });

      test('handles network filtering for Tron addresses', () => {
        const address = 'TRWBqiqoFZysoAeyR1J35ibuyc8EvhUAoY';

        // Should validate when network filter includes 'trx' or 'tron'
        const result1 = validateWalletAddress(address, { network: ['trx'] });
        expect(result1.isValid).toBe(true);

        const result2 = validateWalletAddress(address, { network: ['tron'] });
        expect(result2.isValid).toBe(true);

        // Should not validate when network filter excludes Tron
        const result3 = validateWalletAddress(address, {
          network: ['btc', 'eth'],
        });
        expect(result3.isValid).toBe(false);
      });
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
        'trx',
        'tron',
        null,
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

        // Invalid Tron addresses
        'TRWBqiqoFZysoAeyR1J35ibuyc8EvhUAo', // too short
        'TRWBqiqoFZysoAeyR1J35ibuyc8EvhUAoYY', // too long
        'BRWBqiqoFZysoAeyR1J35ibuyc8EvhUAoY', // wrong prefix
        'TRWBqiqoFZysoAeyR1J35ibuyc8EvhUAo!', // invalid character
        'TRWBqiqoFZysoAeyR1J35ibuyc8EvhUAoI', // invalid base58 character 'I'
        'TRWBqiqoFZysoAeyR1J35ibuyc8EvhUAoO', // invalid base58 character 'O'

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
        const result = validateWalletAddress(address, {
          testnet: true,
          enabledLegacy: true,
          nsDomains: ['eth'],
        });
        try {
          expect(result.network).toBeOneOf(possibleNetworks);
          expect(result.isValid).toBe(false);
        } catch (error) {
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
        isEnterprise: false,
      },
      {
        address: 'ce450000000000000000000000000000000000000000',
        network: 'xce',
        description: 'Core blockchain enterprise',
        printFormat:
          'CE45\u00A00000\u00A00000\u00A00000\u00A00000\u00A00000\u00A00000\u00A00000\u00A00000\u00A00000\u00A00000',
        electronicFormat: 'CE450000000000000000000000000000000000000000',
        isEnterprise: true,
      },
      {
        address: 'ab792215c43fc213c02182c8389f2bc32408e2c50922',
        network: 'xab',
        description: 'Core blockchain testnet',
        printFormat:
          'AB79\u00A02215\u00A0C43F\u00A0C213\u00A0C021\u00A082C8\u00A0389F\u00A02BC3\u00A02408\u00A0E2C5\u00A00922',
        electronicFormat: 'AB792215C43FC213C02182C8389F2BC32408E2C50922',
        isEnterprise: false,
      },
    ];

    test.each(validAddresses)(
      'validates $description address with correct formats',
      ({ address, network, printFormat, electronicFormat, isEnterprise }) => {
        const result = validateWalletAddress(address, { testnet: true });
        expect(result.network).toBe(network);
        expect(result.isValid).toBe(true);
        expect(result.description).toContain('ICAN address');
        expect(result.metadata?.format).toBe('ican');
        expect(result.metadata?.printFormat).toBe(printFormat);
        expect(result.metadata?.electronicFormat).toBe(electronicFormat);
        expect(result.metadata?.isEnterprise).toBe(isEnterprise);
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
    // Save original Buffer before each test
    const originalBuffer = global.Buffer;

    beforeEach(() => {
      // @ts-expect-error Intentionally removing Buffer to test browser compatibility
      delete global.Buffer;
    });

    afterEach(() => {
      // Restore Buffer after each test
      global.Buffer = originalBuffer;
    });

    test('validates EVM addresses without requiring Buffer', () => {
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
    });

    test('validates Bitcoin addresses without requiring Buffer', () => {
      const result = validateWalletAddress(
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
      );
      expect(result.network).toBe('btc');
      expect(result.isValid).toBe(true);
    });

    describe('validates all address types without Buffer dependency', () => {
      test.each([
        ['vitalik.eth', 'ns'],
        ['wallet.vitalik.eth', 'ns'],
        ['cosmos1yw6g44c4pqd2rxgrcqekxg9k8f4fd8xpx2k8c3', 'atom'],
      ])('validates %s address', (address, expectedNetwork) => {
        const result = validateWalletAddress(address, {
          testnet: true,
          nsDomains: ['eth'],
        });
        expect(result.isValid).toBe(true);
        expect(result.network).toBe(expectedNetwork);
      });
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

    describe('NS Domain Validation Errors', () => {
      test('rejects NS domains with invalid characters when not emoji', () => {
        const address = 'invalid@domain.eth';
        const result = validateWalletAddress(address, {
          nsDomains: ['eth'],
          emojiAllowed: false,
        });
        expect(result.network).toBe('ns');
        expect(result.isValid).toBe(false);
        expect(result.description).toBe('Invalid NS domain format');
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
        const result = validateWalletAddress(address, {
          nsDomains: ['eth'],
          emojiAllowed: false,
        });
        expect(result.network).toBe('ns');
        expect(result.isValid).toBe(false);
        expect(result.description).toBe(
          'Emoji characters are disabled in NS domains',
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

    // Add test for uncovered error paths
    test('handles null or undefined options', () => {
      const address = '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97';
      const result1 = validateWalletAddress(address);
      expect(result1.isValid).toBe(true);

      const result2 = validateWalletAddress(address, undefined);
      expect(result2.isValid).toBe(true);
    });

    test('handles missing nsDomains option', () => {
      const address = 'vitalik.eth';
      const result = validateWalletAddress(address, {});
      expect(result.isValid).toBe(false);
      expect(result.description).toContain('Unknown address format');
    });

    describe('Edge Cases', () => {
      test('handles extreme input values', () => {
        // Test extremely long addresses
        const longAddress = '0x' + 'a'.repeat(1000);
        const longResult = validateWalletAddress(longAddress);
        expect(longResult.isValid).toBe(false);

        // Test with various falsy values
        [null, undefined, '', ' '].forEach((value) => {
          const result = validateWalletAddress(value as any);
          expect(result.isValid).toBe(false);
          expect(result.network).toBe(null);
        });

        // Test with non-string types
        [123, {}, [], true, false, () => {}].forEach((value) => {
          const result = validateWalletAddress(value as any);
          expect(result.isValid).toBe(false);
          expect(result.network).toBe(null);
        });
      });

      test('handles all option combinations', () => {
        const address = 'vitalik.eth';
        const testCases = [
          { options: {}, expected: false },
          { options: { nsDomains: ['eth'] }, expected: true },
          { options: { nsDomains: ['eth'], testnet: true }, expected: true },
          { options: { nsDomains: ['eth'], testnet: false }, expected: true },
          {
            options: { nsDomains: ['eth'], emojiAllowed: true },
            expected: true,
          },
          {
            options: { nsDomains: ['eth'], emojiAllowed: false },
            expected: true,
          },
          { options: { testnet: true }, expected: false },
          { options: { emojiAllowed: true }, expected: false },
        ];

        testCases.forEach(({ options, expected }) => {
          const result = validateWalletAddress(address, options);
          expect(result.isValid).toBe(expected);
        });
      });

      test('handles invalid option combinations', () => {
        const address = 'vitalik.eth';
        const testCases = [
          {
            options: { testnet: true, nsDomains: [] },
            expected: false,
            description: 'Empty nsDomains array',
          },
          {
            options: { testnet: true, nsDomains: ['eth'] },
            expected: true,
            description: 'Standard options',
          },
          {
            options: { testnet: 'invalid' as any, nsDomains: ['eth'] },
            expected: false,
            description: 'Invalid testnet option type',
          },
          {
            options: {
              testnet: true,
              nsDomains: ['eth'],
              unknownOption: true,
            } as any,
            expected: true,
            description: 'Unknown option',
          },
        ];

        testCases.forEach(({ options, expected, description }) => {
          const result = validateWalletAddress(address, options);
          expect(result.isValid, description).toBe(expected);
        });
      });

      test('handles special characters and encodings', () => {
        const testCases = [
          {
            address: '\u0000invalid.eth',
            expected: false,
            description: 'Null character',
          },
          {
            address: 'invalid\uFEFFdomain.eth',
            expected: false,
            description: 'Zero-width space',
          },
          {
            address: 'invalid\u200Bdomain.eth',
            expected: false,
            description: 'Zero-width space',
          },
          {
            address: 'invalid\u200Edomain.eth',
            expected: false,
            description: 'Left-to-right mark',
          },
        ];

        testCases.forEach(({ address, expected, description }) => {
          const result = validateWalletAddress(address, { nsDomains: ['eth'] });
          expect(result.isValid, description).toBe(expected);
        });
      });

      test('handles all possible validation scenarios', () => {
        // Test with undefined options
        expect(validateWalletAddress('0x123')).toEqual(
          expect.objectContaining({ isValid: false }),
        );

        // Test with undefined options explicitly
        expect(validateWalletAddress('0x123', undefined)).toEqual(
          expect.objectContaining({ isValid: false }),
        );

        // Test with empty options
        expect(validateWalletAddress('0x123', {})).toEqual(
          expect.objectContaining({ isValid: false }),
        );

        // Test with invalid options type
        expect(validateWalletAddress('0x123', 'invalid' as any)).toEqual(
          expect.objectContaining({ isValid: false }),
        );
      });

      test('handles network filtering', () => {
        // Change 'network' to '_network' since it's unused
        const networks = [
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
          null,
        ];
        networks.forEach((_network) => {
          // Added underscore prefix
          const result = validateWalletAddress('invalid-address');
          expect(result.network).toBeOneOf([...networks]);
        });
      });

      test('handles errors in checksum validation', () => {
        // Test invalid hex strings
        const invalidHexAddresses = [
          '0x123g', // invalid hex
          '0xGHIJ', // invalid hex
          '0x!@#$', // invalid characters
        ];

        invalidHexAddresses.forEach((address) => {
          const result = validateWalletAddress(address);
          expect(result.isValid).toBe(false);
          expect(result.network).toBe('evm');
        });
      });

      test('validates Bitcoin Cash addresses', () => {
        const testCases = [
          {
            address: 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a',
            format: 'CashAddr',
          },
          {
            address: '1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu',
            format: 'Legacy',
          },
        ];

        testCases.forEach(({ address, format }) => {
          const result = validateWalletAddress(address);
          expect(result.network).toBe(format === 'Legacy' ? 'btc' : 'bch');
          expect(result.isValid).toBe(true);
          if (format === 'Legacy') {
            expect(result.metadata?.compatibleWith).toContain('bch');
          }
        });
      });

      // Test invalid characters in ICAN addresses
      test('handles invalid characters in ICAN addresses', () => {
        const invalidAddresses = [
          'cbGG47879011ea207df5b35a24ca6f0859dcfb145999', // Invalid hex chars
          'ce45000000000000000000000000000000000000@000', // Invalid symbol
          'ab79221*c43fc213c02182c8389f2bc32408e2c50922', // Invalid symbol
        ];

        invalidAddresses.forEach((address) => {
          const result = validateWalletAddress(address);
          expect(result.isValid).toBe(false);
        });
      });

      // Test error handling in validation process
      test('handles validation errors gracefully', () => {
        // Mock TextEncoder to throw error
        const originalTextEncoder = global.TextEncoder;
        // @ts-expect-error Intentionally breaking TextEncoder
        global.TextEncoder = function () {
          throw new Error('TextEncoder error');
        };

        const address = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
        const result = validateWalletAddress(address);
        expect(result.isValid).toBe(false);
        expect(result.description).toContain('Validation failed');

        // Restore TextEncoder
        global.TextEncoder = originalTextEncoder;
      });

      // Test Cardano address validation
      test('validates all Cardano address types', () => {
        const addresses = [
          // Invalid format but correct prefix
          'addr1invalid',
          'addr_test1invalid',
          'stake1invalid',
          'stake_test1invalid',
        ];

        addresses.forEach((address) => {
          const result = validateWalletAddress(address);
          expect(result.network).toBe('ada');
          expect(result.isValid).toBe(false);
          expect(result.description).toBe('Invalid Cardano address format');
        });
      });

      // Test Bitcoin Cash address validation
      test('validates Bitcoin Cash address formats', () => {
        // Test invalid CashAddr format
        const invalidAddr = 'bitcoincash:invalid';
        const result = validateWalletAddress(invalidAddr);
        expect(result.isValid).toBe(false);

        // Test valid format but invalid address pattern
        const invalidPattern = 'bitcoincash:z' + 'q'.repeat(41);
        const result2 = validateWalletAddress(invalidPattern);
        expect(result2.isValid).toBe(false);
      });

      // Test network filtering
      test('handles network filtering edge cases', () => {
        const address = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';

        // Test with empty array
        const result1 = validateWalletAddress(address, { network: [] });
        expect(result1.isValid).toBe(true);

        // Test with non-matching networks
        const result2 = validateWalletAddress(address, {
          network: ['btc', 'ltc'],
        });
        expect(result2.isValid).toBe(false);

        // Test with null network option
        const result3 = validateWalletAddress(address, { network: null });
        expect(result3.isValid).toBe(true);
      });

      // Test Solana and Polkadot address conflicts
      test('handles Solana and Polkadot address conflicts', () => {
        const conflictingAddresses = [
          'cosmos1conflictaddress',
          'osmo1conflictaddress',
          'r1conflictaddress',
          'bc1conflictaddress',
          'tb1conflictaddress',
          'ltc1conflictaddress',
          'tltc1conflictaddress',
        ];

        conflictingAddresses.forEach((address) => {
          // When filtering for Solana addresses
          const solResult = validateWalletAddress(address, {
            network: ['sol'],
          });
          expect(solResult.isValid).toBe(false);
          expect(solResult.network).toBe(null);

          // When filtering for Polkadot addresses
          const dotResult = validateWalletAddress(address, {
            network: ['dot'],
          });
          expect(dotResult.isValid).toBe(false);
          expect(dotResult.network).toBe(null);
        });
      });
    });
  });
});

describe('Utility Functions (through validateWalletAddress)', () => {
  describe('EVM Checksum Validation', () => {
    test('validates correct mixed-case address', () => {
      const address = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
      const result = validateWalletAddress(address);
      expect(result.metadata?.isChecksumValid).toBe(true);
    });

    test('validates lowercase address', () => {
      const address = '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed';
      const result = validateWalletAddress(address);
      expect(result.metadata?.isChecksumValid).toBe(true);
    });
  });

  describe('ICAN Checksum Validation', () => {
    test('validates correct ICAN address', () => {
      const address = 'cb7147879011ea207df5b35a24ca6f0859dcfb145999';
      const result = validateWalletAddress(address);
      expect(result.isValid).toBe(true);
      expect(result.metadata?.isChecksumValid).toBe(true);
    });
  });
});

describe('Utility Functions', () => {
  describe('validateWalletAddress Edge Cases', () => {
    test('handles invalid input types', () => {
      const invalidInputs = [
        undefined,
        null,
        123,
        {},
        [],
        true,
        false,
        () => {},
      ];

      invalidInputs.forEach((input) => {
        const result = validateWalletAddress(input as any);
        expect(result.network).toBe(null);
        expect(result.isValid).toBe(false);
        expect(result.description).toBe('Invalid input');
      });
    });

    test('handles invalid options', () => {
      const address = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
      const invalidOptions = [
        {}, // empty object should work
        undefined, // undefined should use default options
      ];

      invalidOptions.forEach((options) => {
        const result = validateWalletAddress(address, options as any);
        expect(result.network).toBe('evm');
        expect(result.isValid).toBeTruthy(); // Valid EVM address should still be valid
      });
    });

    test('handles all network combinations', () => {
      const address = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
      const networks = [
        [],
        ['evm'],
        ['btc'],
        ['evm', 'btc'],
        ['unknown'],
        null,
        undefined,
      ];

      networks.forEach((network) => {
        const result = validateWalletAddress(address, { network });
        if (!network || network.length === 0 || network.includes('evm')) {
          expect(result.isValid).toBe(true);
        } else {
          expect(result.isValid).toBe(false);
        }
      });
    });

    test('handles all testnet combinations', () => {
      const testnetAddresses = [
        'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
        'tltc1qk2ergl0hvg8g8r89nwqjl6m6k76rgwsh95qm9d',
        'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
      ];

      const testnetOptions = [
        { testnet: true },
        { testnet: false },
        { testnet: undefined },
        {},
      ];

      testnetAddresses.forEach((address) => {
        testnetOptions.forEach((options) => {
          const result = validateWalletAddress(address, options);
          if (options.testnet === false) {
            expect(result.isValid).toBe(false);
            expect(result.description).toBe('Testnet address not allowed');
          }
        });
      });
    });

    test('handles all NS domain combinations', () => {
      const domains = [
        'vitalik.eth',
        'wallet.vitalik.eth',
        '🦊.eth',
        'crypto🦊.eth',
        '🦊crypto.eth',
      ];

      const nsDomainOptions = [
        { nsDomains: ['eth'] },
        { nsDomains: [] },
        { nsDomains: undefined },
        { nsDomains: ['eth'], emojiAllowed: true },
        { nsDomains: ['eth'], emojiAllowed: false },
      ];

      domains.forEach((domain) => {
        nsDomainOptions.forEach((options) => {
          const result = validateWalletAddress(domain, options);
          if (!options.nsDomains?.length) {
            expect(result.isValid).toBe(false);
          } else if (
            options.emojiAllowed === false &&
            domain.match(/\p{Extended_Pictographic}/u)
          ) {
            expect(result.isValid).toBe(false);
            expect(result.description).toBe(
              'Emoji characters are disabled in NS domains',
            );
          }
        });
      });
    });

    test('handles error cases in validation', () => {
      const address = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';

      // Test with Buffer being undefined
      const originalBuffer = global.Buffer;
      // @ts-expect-error Intentionally removing Buffer
      delete global.Buffer;

      const result = validateWalletAddress(address);
      expect(result.isValid).toBe(true);
      expect(result.network).toBe('evm');

      // Restore Buffer
      global.Buffer = originalBuffer;
    });
  });

  describe('validateEVMChecksum', () => {
    test('handles all checksum validation cases', () => {
      const testCases = [
        {
          address: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
          force: true,
          expected: true,
        },
        {
          address: '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed',
          force: true,
          expected: false,
        },
        {
          address: '0x5AAEB6053F3E94C9B9A09F33669435E7EF1BEAED',
          force: true,
          expected: false,
        },
        {
          address: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
          force: false,
          expected: true,
        },
        {
          address: '0xinvalid',
          force: false,
          expected: false,
        },
      ];

      testCases.forEach(({ address, force, expected }) => {
        const result = validateWalletAddress(address, {}, force);
        expect(result.isValid).toBe(expected);
      });
    });

    test('returns false for non-hex inputs', () => {
      expect(validateEVMChecksum('0x123' as any)).toBe(false);
    });
  });
});

describe('Hex Validation', () => {
  test('validates hex addresses', () => {
    const result = validateWalletAddress('0xff008040');
    expect(result.network).toBe('evm');
    expect(result.isValid).toBe(false);
  });

  test('handles empty hex', () => {
    const result = validateWalletAddress('0x');
    expect(result.isValid).toBe(false);
  });

  test('handles various hex values', () => {
    const hexAddresses = ['0xff00', '0x0000', '0xffff', '0x1234'];

    hexAddresses.forEach((address) => {
      const result = validateWalletAddress(address);
      expect(result.network).toBe('evm');
      expect(result.isValid).toBe(false);
    });
  });
});

describe('Edge Cases and Corner Cases', () => {
  test('handles addresses with mixed case prefixes', () => {
    const addresses = [
      'BiTcOiNcAsH:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a',
      'Bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      'TlTc1qk2ergl0hvg8g8r89nwqjl6m6k76rgwsh95qm9d',
    ];

    addresses.forEach((address) => {
      const result = validateWalletAddress(address);
      expect(result.isValid).toBe(false);
      expect(result.description).toMatch(
        /Invalid .* format|Unknown address format/,
      );
    });
  });

  test('handles addresses with zero-width spaces and other invisible characters', () => {
    const addresses = [
      '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed\u200B',
      '\u200E0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
      '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed\uFEFF',
    ];

    addresses.forEach((address) => {
      const result = validateWalletAddress(address);
      expect(result.isValid).toBe(false);
      expect(result.description).toMatch(
        /Invalid .* format|Unknown address format/,
      );
    });
  });
});

describe('Network-Specific Edge Cases', () => {
  describe('EVM Network', () => {
    test('handles EVM addresses with valid hex but invalid length', () => {
      const addresses = [
        '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAe', // one character short
        '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAedd', // one character long
      ];

      addresses.forEach((address) => {
        const result = validateWalletAddress(address);
        expect(result.network).toBe('evm');
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('NS Domains', () => {
    test('handles NS domains with maximum length components', () => {
      const longLabel = 'a'.repeat(63); // Maximum length for a DNS label
      const domains = [`${longLabel}.eth`, `${longLabel}.${longLabel}.eth`];

      domains.forEach((domain) => {
        const result = validateWalletAddress(domain, { nsDomains: ['eth'] });
        expect(result.network).toBe('ns');
        expect(result.isValid).toBe(true);
      });
    });

    test('handles NS domains with invalid length components', () => {
      const tooLongLabel = 'a'.repeat(256); // Exceeds maximum length for a DNS label
      const tooLongTotal = Array(5).fill('a'.repeat(63)).join('.'); // Creates a very long domain with dots

      const domains = [
        `sub.${tooLongLabel}.eth`, // Label too long in subdomain
        `${tooLongTotal}.eth`, // Total length too long (>255 chars)
      ];

      domains.forEach((domain) => {
        const result = validateWalletAddress(domain, { nsDomains: ['eth'] });
        expect(result.network).toBe('ns');
        expect(result.isValid).toBe(false);
        expect(result.description).toBe(
          'NS domain exceeds maximum total length of 255 characters',
        );
      });
    });
  });

  describe('Option Validation', () => {
    test('handles invalid option types', () => {
      const address = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
      const invalidOptions = [
        { testnet: 'yes' }, // string instead of boolean
        { nsDomains: 'eth' }, // string instead of array
        { network: 'sol' }, // string instead of array
      ];

      invalidOptions.forEach((options) => {
        // @ts-expect-error Testing invalid option types
        const result = validateWalletAddress(address, options);
        expect(result.isValid).toBe(false); // Expect validation to fail with invalid options
        expect(result.description).toContain('Invalid options'); // Add appropriate error message
      });
    });
  });
});

describe('Cross-Network Validation', () => {
  test('handles addresses that could be valid in multiple networks', () => {
    // Test addresses that could potentially match multiple network patterns
    const address = '1234567890123456789012345678901234567890'; // Could match multiple patterns

    // Test with different network filters
    const networks = ['evm', 'btc', 'ltc', 'sol'];
    networks.forEach((network) => {
      const result = validateWalletAddress(address, { network: [network] });
      expect(result.isValid).toBe(false);
    });
  });
});
