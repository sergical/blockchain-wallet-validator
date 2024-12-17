import { validateWalletAddress } from '../index';

describe('validateWalletAddress', () => {
  test('validates EVM address', () => {
    const result = validateWalletAddress('0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97');
    expect(result.network).toBe('evm');
    expect(result.isValid).toBe(true);
    expect(result.description).toContain('Ethereum Virtual Machine');
  });

  test('validates ENS domain', () => {
    const result = validateWalletAddress('vitalik.eth');
    expect(result.network).toBe('evm');
    expect(result.isValid).toBe(true);
    expect(result.description).toContain('Ethereum Name Service');
  });

  test('validates Solana address', () => {
    const result = validateWalletAddress('DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy');
    expect(result.network).toBe('solana');
    expect(result.isValid).toBe(true);
  });

  test('validates Cosmos address', () => {
    const addresses = [
      'cosmos1yw6g44c4pqd2rxgrcqekxg9k8f4fd8xpx2k8c3',
      'osmo1yw6g44c4pqd2rxgrcqekxg9k8f4fd8xpabcd12',
      'juno1yw6g44c4pqd2rxgrcqekxg9k8f4fd8xp123456'
    ];
    
    addresses.forEach(address => {
      const result = validateWalletAddress(address);
      expect(result.network).toBe('cosmos');
      expect(result.isValid).toBe(true);
    });
  });

  test('validates Bitcoin addresses', () => {
    const testCases = [
      {
        address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        description: 'Legacy'
      },
      {
        address: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
        description: 'SegWit'
      },
      {
        address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        description: 'Native SegWit'
      }
    ];

    testCases.forEach(({ address, description }) => {
      const result = validateWalletAddress(address);
      expect(result.network).toBe('bitcoin');
      expect(result.isValid).toBe(true);
      expect(result.description).toContain(description);
    });
  });

  test('validates Cardano address', () => {
    const result = validateWalletAddress('addr1qxy8m0txfw2ng2z5wh5sps7n5r7alpx7w4l6zpxymr2myj8mmqwzf9h82zj2f9q76q2wqy572hp0pk7tnrcnx0a7esq5s7qm4');
    expect(result.network).toBe('cardano');
    expect(result.isValid).toBe(true);
  });

  test('validates Polkadot address', () => {
    const result = validateWalletAddress('1FRMM8PEiWXYax7rpS6X4XZX1aAAxSWx1CrKTyrVYhV24fg');
    expect(result.network).toBe('polkadot');
    expect(result.isValid).toBe(true);
  });

  test('handles invalid addresses', () => {
    const invalidAddresses = [
      '',
      '   ',
      'not-an-address',
      '0x123', // too short EVM
      'invalid.eth',
      '1234567890', // random numbers
    ];

    invalidAddresses.forEach(address => {
      const result = validateWalletAddress(address);
      expect(result.network).toBe('unknown');
      expect(result.isValid).toBe(false);
    });
  });

  test('handles whitespace in addresses', () => {
    const addressWithSpace = '  0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97  ';
    const result = validateWalletAddress(addressWithSpace);
    expect(result.network).toBe('evm');
    expect(result.isValid).toBe(true);
  });
});