import { NetworkId } from '../types/arbitrage';

export interface ChainlinkOracleConfig {
  pair: string;
  baseAsset: string;
  quoteAsset: string;
  aggregatorAddress: string;
  decimals: number;
  heartbeatSec: number;
  deviationThresholdPct: number;
}

export const CHAINLINK_FEEDS: Record<NetworkId, Record<string, ChainlinkOracleConfig>> = {
  ethereum: {
    'ETH/USD': {
      pair: 'ETH/USD',
      baseAsset: 'WETH',
      quoteAsset: 'USD',
      aggregatorAddress: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
      decimals: 8,
      heartbeatSec: 3600,
      deviationThresholdPct: 0.5
    },
    'BTC/USD': {
      pair: 'BTC/USD',
      baseAsset: 'WBTC',
      quoteAsset: 'USD',
      aggregatorAddress: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
      decimals: 8,
      heartbeatSec: 3600,
      deviationThresholdPct: 0.5
    },
    'USDC/USD': {
      pair: 'USDC/USD',
      baseAsset: 'USDC',
      quoteAsset: 'USD',
      aggregatorAddress: '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
      decimals: 8,
      heartbeatSec: 86400,
      deviationThresholdPct: 0.25
    },
    'USDT/USD': {
      pair: 'USDT/USD',
      baseAsset: 'USDT',
      quoteAsset: 'USD',
      aggregatorAddress: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
      decimals: 8,
      heartbeatSec: 86400,
      deviationThresholdPct: 0.25
    },
    'DAI/USD': {
      pair: 'DAI/USD',
      baseAsset: 'DAI',
      quoteAsset: 'USD',
      aggregatorAddress: '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
      decimals: 8,
      heartbeatSec: 3600,
      deviationThresholdPct: 0.5
    }
  },
  arbitrum: {
    'ETH/USD': {
      pair: 'ETH/USD',
      baseAsset: 'WETH',
      quoteAsset: 'USD',
      aggregatorAddress: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
      decimals: 8,
      heartbeatSec: 86400,
      deviationThresholdPct: 0.25
    },
    'ARB/USD': {
      pair: 'ARB/USD',
      baseAsset: 'ARB',
      quoteAsset: 'USD',
      aggregatorAddress: '0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6',
      decimals: 8,
      heartbeatSec: 86400,
      deviationThresholdPct: 0.5
    },
    'BTC/USD': {
      pair: 'BTC/USD',
      baseAsset: 'WBTC',
      quoteAsset: 'USD',
      aggregatorAddress: '0x6ce185860a4963106506C203335A2910413708e9',
      decimals: 8,
      heartbeatSec: 86400,
      deviationThresholdPct: 0.25
    },
    'USDC/USD': {
      pair: 'USDC/USD',
      baseAsset: 'USDC',
      quoteAsset: 'USD',
      aggregatorAddress: '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
      decimals: 8,
      heartbeatSec: 86400,
      deviationThresholdPct: 0.25
    }
  },
  polygon: {
    'POL/USD': {
      pair: 'POL/USD',
      baseAsset: 'WMATIC',
      quoteAsset: 'USD',
      aggregatorAddress: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
      decimals: 8,
      heartbeatSec: 120,
      deviationThresholdPct: 0.5
    },
    'ETH/USD': {
      pair: 'ETH/USD',
      baseAsset: 'WETH',
      quoteAsset: 'USD',
      aggregatorAddress: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
      decimals: 8,
      heartbeatSec: 120,
      deviationThresholdPct: 0.5
    },
    'USDC/USD': {
      pair: 'USDC/USD',
      baseAsset: 'USDC',
      quoteAsset: 'USD',
      aggregatorAddress: '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7',
      decimals: 8,
      heartbeatSec: 86400,
      deviationThresholdPct: 0.25
    }
  },
  optimism: {
    'ETH/USD': {
      pair: 'ETH/USD',
      baseAsset: 'WETH',
      quoteAsset: 'USD',
      aggregatorAddress: '0x13e3Ee699D1909E989720E631884b45705C3f449',
      decimals: 8,
      heartbeatSec: 1200,
      deviationThresholdPct: 0.5
    },
    'OP/USD': {
      pair: 'OP/USD',
      baseAsset: 'OP',
      quoteAsset: 'USD',
      aggregatorAddress: '0x0D276FC14719f9292D5C1eA2198673d1f4269246',
      decimals: 8,
      heartbeatSec: 1200,
      deviationThresholdPct: 0.5
    },
    'USDC/USD': {
      pair: 'USDC/USD',
      baseAsset: 'USDC',
      quoteAsset: 'USD',
      aggregatorAddress: '0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3',
      decimals: 8,
      heartbeatSec: 86400,
      deviationThresholdPct: 0.25
    }
  },
  zksync: {
    'ETH/USD': {
      pair: 'ETH/USD',
      baseAsset: 'WETH',
      quoteAsset: 'USD',
      aggregatorAddress: '0x6D41d1be694E2E0455B110d9fe78888b14a2F3f9',
      decimals: 8,
      heartbeatSec: 3600,
      deviationThresholdPct: 0.5
    },
    'USDC/USD': {
      pair: 'USDC/USD',
      baseAsset: 'USDC',
      quoteAsset: 'USD',
      aggregatorAddress: '0x161C0AE68e0d4E95F0624d7768eeb960f224976c',
      decimals: 8,
      heartbeatSec: 86400,
      deviationThresholdPct: 0.25
    }
  }
};
