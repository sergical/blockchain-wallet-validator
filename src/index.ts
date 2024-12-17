interface NetworkInfo {
  network: string;
  isValid: boolean;
  description?: string;
}

export function validateWalletAddress(address: string): NetworkInfo {
  address = address.trim();

  // EVM (Ethereum, Polygon, BSC, etc.)
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return {
      network: "evm",
      isValid: true,
      description:
        "Ethereum Virtual Machine compatible address (Ethereum, Polygon, BSC, etc.)",
    };
  }

  // ENS Domain
  if (/^[a-zA-Z0-9-]+\.eth$/.test(address)) {
    return {
      network: "evm",
      isValid: true,
      description: "Ethereum Name Service domain",
    };
  }

  // Solana
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    return {
      network: "solana",
      isValid: true,
      description: "Solana address",
    };
  }

  // Cosmos (checking for common prefixes)
  if (/^(cosmos|osmo|axelar|juno|stars)[1-9a-z]{38,39}$/.test(address)) {
    return {
      network: "cosmos",
      isValid: true,
      description: "Cosmos ecosystem address",
    };
  }

  // Bitcoin Legacy
  if (/^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) {
    return {
      network: "bitcoin",
      isValid: true,
      description: "Bitcoin Legacy address",
    };
  }

  // Bitcoin SegWit
  if (/^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) {
    return {
      network: "bitcoin",
      isValid: true,
      description: "Bitcoin SegWit address",
    };
  }

  // Bitcoin Native SegWit (bech32)
  if (/^bc1[a-zA-HJ-NP-Z0-9]{25,39}$/.test(address)) {
    return {
      network: "bitcoin",
      isValid: true,
      description: "Bitcoin Native SegWit address",
    };
  }

  // Cardano
  if (/^addr1[a-zA-Z0-9]{58}$/.test(address)) {
    return {
      network: "cardano",
      isValid: true,
      description: "Cardano address",
    };
  }

  // Polkadot
  if (/^[1-9A-HJ-NP-Za-km-z]{47,48}$/.test(address)) {
    return {
      network: "polkadot",
      isValid: true,
      description: "Polkadot address",
    };
  }

  // If no matches found
  return {
    network: "unknown",
    isValid: false,
    description: "Unknown address format",
  };
}
