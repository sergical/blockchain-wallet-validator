import { describe, test, expect } from 'vitest';
import { validateWalletAddress } from '../index';

describe('validateWalletAddress', () => {
  describe('EVM Addresses', () => {
    test('validates checksum EVM address', () => {
      const result = validateWalletAddress(
        '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97',
      );
      expect(result.network).toBe('evm');
      expect(result.isValid).toBe(true);
      expect(result.description).toContain('Ethereum Virtual Machine');
      expect(result.metadata?.isChecksumValid).toBe(true);
    });

    test('validates lowercase EVM address', () => {
      const result = validateWalletAddress(
        '0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97',
      );
      expect(result.network).toBe('evm');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.format).toBe('hex');
    });

    test('invalidates incorrect checksum EVM address', () => {
      const result = validateWalletAddress(
        '0x4838B106FCE9647BDF1E7877BF73CE8B0BAD5F97',
      );
      expect(result.network).toBe('evm');
      expect(result.isValid).toBe(false);
    });
  });

  describe('ENS Domains', () => {
    test('validates simple ENS domain', () => {
      const result = validateWalletAddress('vitalik.eth');
      expect(result.network).toBe('evm');
      expect(result.isValid).toBe(true);
      expect(result.description).toContain('Ethereum Name Service');
      expect(result.metadata?.isSubdomain).toBe(false);
    });

    test('validates ENS domain with dashes', () => {
      const validDashDomains = [
        'invalid.eth',
        '-invalid.eth',
        'invalid-.eth',
        'inval-id.eth',
        '-inval-id-.eth',
        'really---long.eth',
      ];

      validDashDomains.forEach((domain) => {
        const result = validateWalletAddress(domain);
        expect(result.network).toBe('evm');
        expect(result.isValid).toBe(true);
        expect(result.metadata?.isSubdomain).toBe(false);
      });
    });

    test('validates ENS subdomain', () => {
      const result = validateWalletAddress('wallet.vitalik.eth');
      expect(result.network).toBe('evm');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.isSubdomain).toBe(true);
    });

    test('validates ENS subdomain with dashes', () => {
      const result = validateWalletAddress('-sub-.vit-alik.eth');
      expect(result.network).toBe('evm');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.isSubdomain).toBe(true);
    });
  });

  describe('Solana Addresses', () => {
    test('validates Solana address', () => {
      const result = validateWalletAddress(
        'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy',
      );
      expect(result.network).toBe('solana');
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
      expect(result.network).toBe('cosmos');
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
        expect(result.network).toBe('bitcoin');
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
      expect(result.network).toBe('bitcoin');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.isTestnet).toBe(true);
    });
  });

  describe('Other Networks', () => {
    test('validates Cardano address', () => {
      const result = validateWalletAddress(
        'addr1qxy8m0txfw2ng2z5wh5sps7n5r7alpx7w4l6zpxymr2myj8mmqwzf9h82zj2f9q76q2wqy572hp0pk7tnrcnx0a7esq5s7qm4',
      );
      expect(result.network).toBe('cardano');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.format).toBe('bech32');
      expect(result.metadata?.era).toBe('shelley');
    });

    test('validates Polkadot address', () => {
      const result = validateWalletAddress(
        '1FRMM8PEiWXYax7rpS6X4XZX1aAAxSWx1CrKTyrVYhV24fg',
      );
      expect(result.network).toBe('polkadot');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.format).toBe('ss58');
    });

    test('validates Ripple address', () => {
      const result = validateWalletAddress(
        'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
      );
      expect(result.network).toBe('ripple');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.format).toBe('base58');
    });

    test('validates Algorand address', () => {
      const result = validateWalletAddress(
        'VCMJKWOY5P5P7SKMZFFOCEROPJCZOTIJMNIYNUCKH7LRO45JMJP6UYBIJA',
      );
      expect(result.network).toBe('algorand');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.format).toBe('base32');
    });

    test('validates Stellar address', () => {
      const result = validateWalletAddress(
        'GBQMXVTR5HQNRGXPR4ZPBOZR7VQXOQMEQMZWIVLIW2MYBXC2HQWZZ4VJ',
      );
      expect(result.network).toBe('stellar');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.format).toBe('base32');
      expect(result.metadata?.type).toBe('public');
    });
  });

  describe('Invalid Addresses', () => {
    test('handles invalid addresses', () => {
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
        const result = validateWalletAddress(address);
        try {
          expect(result.network).toBe('unknown');
          expect(result.isValid).toBe(false);
        } catch (error) {
          console.log(`Failed validation for address: "${address}"`);
          console.log('Result:', result);
          throw error;
        }
      });
    });

    test('handles whitespace in addresses', () => {
      const addressWithSpace = '  0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97  ';
      const result = validateWalletAddress(addressWithSpace);
      expect(result.network).toBe('evm');
      expect(result.isValid).toBe(true);
    });
  });
});
