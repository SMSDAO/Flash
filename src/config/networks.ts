import { NetworkConfig, ProtocolType } from '../types/arbitrage';

export const NETWORKS: Record<string, NetworkConfig> = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum Mainnet',
    chainId: 1,
    currency: 'ETH',
    explorerUrl: 'https://etherscan.io',
    rpcUrl: 'https://eth.llamarpc.com',
    aavePoolAddress: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', // Aave V3 Ethereum Pool
    defaultContractAddress: '0x71C8F7965F2e5241e72C8928B3f4d0E7d337A612',
    avgBlockTime: 12.1,
    baseFeeGwei: 16.5,
    priorityFeeGwei: 1.8,
    isL2: false,
    minOperationalGasReserve: 0.3, // 0.3 ETH on Mainnet
    minOperationalGasReserveCurrency: 'ETH',
    avgGasCostRangeUsd: '$20.00 – $100.00+',
    gasEfficiencyRating: 'Low (High Capital L1 Barrier)',
    relays: [
      { name: 'Flashbots Protect', endpoint: 'https://relay.flashbots.net', description: 'Primary institutional MEV relay' },
      { name: 'Titan Builder', endpoint: 'https://rpc.titanbuilder.xyz', description: 'Ultra-low latency top block builder' },
      { name: 'BeaverBuild', endpoint: 'https://rpc.beaverbuild.org', description: 'High-frequency proprietary MEV pipeline' },
      { name: 'Builder0x69', endpoint: 'https://builder0x69.io', description: 'Decentralized block building consortium' }
    ],
    dexes: [
      { protocol: ProtocolType.UNISWAP_V3, name: 'Uniswap V3', routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564' },
      { protocol: ProtocolType.UNISWAP_V2, name: 'Uniswap V2', routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' },
      { protocol: ProtocolType.BALANCER_V2, name: 'Balancer V2 Vault', routerAddress: '0xBA12222222228d8Ba5359726c66A106831701349', vaultAddress: '0xBA12222222228d8Ba5359726c66A106831701349' },
      { protocol: ProtocolType.CURVE_V2, name: 'Curve V2 TriCrypto', routerAddress: '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46' }
    ],
    tokens: [
      { symbol: 'WETH', name: 'Wrapped Ether', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, usdPrice: 3120.50 },
      { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, usdPrice: 1.00 },
      { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, usdPrice: 1.00 },
      { symbol: 'WBTC', name: 'Wrapped BTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, usdPrice: 91400.00 },
      { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, usdPrice: 1.00 }
    ]
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum One',
    chainId: 42161,
    currency: 'ETH',
    explorerUrl: 'https://arbiscan.io',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    aavePoolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Aave V3 Arbitrum
    defaultContractAddress: '0x88F969e2c45F8585D2C24018318856641e7F4C82',
    avgBlockTime: 0.25,
    baseFeeGwei: 0.1,
    priorityFeeGwei: 0.05,
    isL2: true,
    minOperationalGasReserve: 0.05, // 0.05 ETH on L2
    minOperationalGasReserveCurrency: 'ETH',
    avgGasCostRangeUsd: '$0.02 – $0.10',
    gasEfficiencyRating: 'Ultra High (L2 Rollup)',
    relays: [
      { name: 'Arbitrum Sequencer Feed', endpoint: 'https://arb1.arbitrum.io/rpc', description: 'Direct L2 sequencer fast-path' },
      { name: 'Flashbots L2 Protect', endpoint: 'https://arbitrum.mev-share.flashbots.net', description: 'Private sub-second orderflow bundle' }
    ],
    dexes: [
      { protocol: ProtocolType.UNISWAP_V3, name: 'Uniswap V3 (Arb)', routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564' },
      { protocol: ProtocolType.UNISWAP_V2, name: 'Camelot V2 Router', routerAddress: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d' },
      { protocol: ProtocolType.BALANCER_V2, name: 'Balancer V2 Vault', routerAddress: '0xBA12222222228d8Ba5359726c66A106831701349', vaultAddress: '0xBA12222222228d8Ba5359726c66A106831701349' },
      { protocol: ProtocolType.CURVE_V2, name: 'Curve V2 2Pool', routerAddress: '0x7f90122BF0700F9E7e1F688fe926940E8839F353' }
    ],
    tokens: [
      { symbol: 'WETH', name: 'Wrapped Ether', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, usdPrice: 3120.50 },
      { symbol: 'ARB', name: 'Arbitrum Token', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, usdPrice: 0.78 },
      { symbol: 'USDC', name: 'USD Coin (Native)', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, usdPrice: 1.00 },
      { symbol: 'USDT', name: 'Tether USD', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6, usdPrice: 1.00 },
      { symbol: 'WBTC', name: 'Wrapped BTC', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8, usdPrice: 91400.00 }
    ]
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon PoS',
    chainId: 137,
    currency: 'POL',
    explorerUrl: 'https://polygonscan.com',
    rpcUrl: 'https://polygon-rpc.com',
    aavePoolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Aave V3 Polygon
    defaultContractAddress: '0x32A4612e45F8585D2C24018318856641e7F4C82',
    avgBlockTime: 2.1,
    baseFeeGwei: 35.0,
    priorityFeeGwei: 30.0,
    isL2: true,
    minOperationalGasReserve: 100, // 100 POL native reserve on Polygon
    minOperationalGasReserveCurrency: 'POL',
    avgGasCostRangeUsd: '$0.005 – $0.02',
    gasEfficiencyRating: 'Extreme (Sub-Cent Arbitrage)',
    relays: [
      { name: 'Polygon FastBor Relay', endpoint: 'https://polygon-bor.publicnode.com', description: 'Direct validator priority inclusion' },
      { name: 'BloxRoute Polygon BDN', endpoint: 'https://polygon.gateway.bloxroute.com', description: 'Enterprise high-speed gateway' }
    ],
    dexes: [
      { protocol: ProtocolType.UNISWAP_V3, name: 'Uniswap V3', routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564' },
      { protocol: ProtocolType.UNISWAP_V2, name: 'QuickSwap V2 Router', routerAddress: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff' },
      { protocol: ProtocolType.BALANCER_V2, name: 'Balancer V2 Vault', routerAddress: '0xBA12222222228d8Ba5359726c66A106831701349', vaultAddress: '0xBA12222222228d8Ba5359726c66A106831701349' },
      { protocol: ProtocolType.CURVE_V2, name: 'Curve Aave Pool', routerAddress: '0x445FE580eF8d70FF569aB36e80c647af338db351' }
    ],
    tokens: [
      { symbol: 'WMATIC', name: 'Wrapped Polygon', address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 18, usdPrice: 0.48 },
      { symbol: 'USDC', name: 'USD Coin', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6, usdPrice: 1.00 },
      { symbol: 'USDT', name: 'Tether USD', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6, usdPrice: 1.00 },
      { symbol: 'WETH', name: 'Wrapped Ether', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, usdPrice: 3120.50 }
    ]
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism Mainnet',
    chainId: 10,
    currency: 'ETH',
    explorerUrl: 'https://optimistic.etherscan.io',
    rpcUrl: 'https://mainnet.optimism.io',
    aavePoolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Aave V3 Optimism
    defaultContractAddress: '0x99A4612e45F8585D2C24018318856641e7F4C82',
    avgBlockTime: 2.0,
    baseFeeGwei: 0.08,
    priorityFeeGwei: 0.04,
    isL2: true,
    minOperationalGasReserve: 0.05, // 0.05 ETH on L2
    minOperationalGasReserveCurrency: 'ETH',
    avgGasCostRangeUsd: '$0.02 – $0.10',
    gasEfficiencyRating: 'Ultra High (L2 Bedrock)',
    relays: [
      { name: 'OP Sequencer Private', endpoint: 'https://mainnet.optimism.io', description: 'Optimism Bedrock sequencer mempool' }
    ],
    dexes: [
      { protocol: ProtocolType.UNISWAP_V3, name: 'Uniswap V3', routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564' },
      { protocol: ProtocolType.UNISWAP_V2, name: 'Velodrome V2 Router', routerAddress: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858' },
      { protocol: ProtocolType.CURVE_V2, name: 'Curve 3pool OP', routerAddress: '0x1337BedC9D22ecbe766dF105c900334c9796B672' }
    ],
    tokens: [
      { symbol: 'WETH', name: 'Wrapped Ether', address: '0x4200000000000000000000000000000000000006', decimals: 18, usdPrice: 3120.50 },
      { symbol: 'OP', name: 'Optimism', address: '0x4200000000000000000000000000000000000042', decimals: 18, usdPrice: 1.62 },
      { symbol: 'USDC', name: 'USD Coin', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6, usdPrice: 1.00 },
      { symbol: 'USDT', name: 'Tether USD', address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6, usdPrice: 1.00 }
    ]
  },
  zksync: {
    id: 'zksync',
    name: 'zkSync Era',
    chainId: 324,
    currency: 'ETH',
    explorerUrl: 'https://explorer.zksync.io',
    rpcUrl: 'https://mainnet.era.zksync.io',
    aavePoolAddress: '0x4d9429246EA989C9CEE203B43F6d1C7D83e3B8F8', // ZeroLend/Aave V3 fork
    defaultContractAddress: '0x55B4612e45F8585D2C24018318856641e7F4C82',
    avgBlockTime: 1.1,
    baseFeeGwei: 0.25,
    priorityFeeGwei: 0.1,
    isL2: true,
    minOperationalGasReserve: 0.05, // 0.05 ETH on L2
    minOperationalGasReserveCurrency: 'ETH',
    avgGasCostRangeUsd: '$0.04 – $0.12',
    gasEfficiencyRating: 'Very High (ZK Rollup)',
    relays: [
      { name: 'zkSync State Validator Endpoint', endpoint: 'https://mainnet.era.zksync.io', description: 'Zero-knowledge sequencer node' }
    ],
    dexes: [
      { protocol: ProtocolType.UNISWAP_V2, name: 'SyncSwap Router', routerAddress: '0x2da10A1e27bF85cEdD8FFb1AbBe97e53391C0295' },
      { protocol: ProtocolType.UNISWAP_V3, name: 'PancakeSwap V3 (zkSync)', routerAddress: '0xf8b59f3c3Ab33200ec80a8A58b2aA5F5D2a8944C' }
    ],
    tokens: [
      { symbol: 'WETH', name: 'Wrapped Ether', address: '0x5AEa5775959fBC2557Cc8789612932475357970F', decimals: 18, usdPrice: 3120.50 },
      { symbol: 'USDC', name: 'USD Coin', address: '0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4', decimals: 6, usdPrice: 1.00 },
      { symbol: 'ZK', name: 'ZK Nation Token', address: '0x5A7d6b2F92C77FAD6CCaBd1EE0624E64907Eaf3E', decimals: 18, usdPrice: 0.16 }
    ]
  }
};
