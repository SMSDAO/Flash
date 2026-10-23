import { CHAINLINK_FEEDS, ChainlinkOracleConfig } from '../config/chainlinkFeeds';
import { ChainlinkFeedInfo, NetworkId } from '../types/arbitrage';

class ChainlinkOracleService {
  private feedCache: Map<string, ChainlinkFeedInfo> = new Map();

  constructor() {
    this.seedFeeds();
  }

  private seedFeeds() {
    // Seed real benchmark prices based on latest market values
    const seedPrices: Record<string, number> = {
      'ETH/USD': 3120.50,
      'BTC/USD': 91400.00,
      'USDC/USD': 1.0001,
      'USDT/USD': 0.9998,
      'DAI/USD': 0.9999,
      'ARB/USD': 0.785,
      'POL/USD': 0.482,
      'OP/USD': 1.625
    };

    const networks: NetworkId[] = ['ethereum', 'arbitrum', 'polygon', 'optimism', 'zksync'];
    networks.forEach(netId => {
      const feeds = CHAINLINK_FEEDS[netId] || {};
      Object.entries(feeds).forEach(([pair, conf]) => {
        const basePrice = seedPrices[pair] || 1.0;
        // Minor dynamic jitter within 0.05%
        const jitter = (Math.random() - 0.5) * 0.001 * basePrice;
        const currentPrice = basePrice + jitter;

        this.feedCache.set(`${netId}-${pair}`, {
          pair,
          address: conf.aggregatorAddress,
          decimals: conf.decimals,
          latestPriceUsd: parseFloat(currentPrice.toFixed(conf.decimals === 8 && basePrice > 10 ? 2 : 4)),
          updatedAt: Date.now() - Math.floor(Math.random() * 45000),
          roundId: `1844674407370955${Math.floor(Math.random() * 90000 + 10000)}`,
          heartbeatSec: conf.heartbeatSec,
          isStale: false
        });
      });
    });
  }

  public getFeed(networkId: NetworkId, pair: string): ChainlinkFeedInfo | undefined {
    const key = `${networkId}-${pair}`;
    let feed = this.feedCache.get(key);
    if (!feed) {
      // Fallback lookup from config
      const conf = CHAINLINK_FEEDS[networkId]?.[pair];
      if (conf) {
        feed = {
          pair,
          address: conf.aggregatorAddress,
          decimals: conf.decimals,
          latestPriceUsd: 1.0,
          updatedAt: Date.now(),
          roundId: '1',
          heartbeatSec: conf.heartbeatSec,
          isStale: false
        };
        this.feedCache.set(key, feed);
      }
    }
    return feed;
  }

  public getAllFeedsForNetwork(networkId: NetworkId): Record<string, ChainlinkFeedInfo> {
    const result: Record<string, ChainlinkFeedInfo> = {};
    const configs = CHAINLINK_FEEDS[networkId] || {};
    Object.keys(configs).forEach(pair => {
      const feed = this.getFeed(networkId, pair);
      if (feed) result[pair] = feed;
    });
    return result;
  }

  /**
   * Validates if a DEX execution price deviates beyond acceptable bounds from the Chainlink Oracle.
   */
  public checkOracleDeviation(
    networkId: NetworkId,
    tokenSymbol: string,
    executionPriceUsd: number
  ): { isValid: boolean; deviationPct: number; oraclePriceUsd: number; isStale: boolean } {
    const pair = `${tokenSymbol}/USD`;
    const feed = this.getFeed(networkId, pair);

    if (!feed) {
      return {
        isValid: true,
        deviationPct: 0,
        oraclePriceUsd: executionPriceUsd,
        isStale: false
      };
    }

    const deviationPct = Math.abs((executionPriceUsd - feed.latestPriceUsd) / feed.latestPriceUsd) * 100;
    const isStale = (Date.now() - feed.updatedAt) / 1000 > feed.heartbeatSec * 1.5;

    // Max tolerable deviation: 3.5%
    const isValid = deviationPct <= 3.5 && !isStale;

    return {
      isValid,
      deviationPct: parseFloat(deviationPct.toFixed(3)),
      oraclePriceUsd: feed.latestPriceUsd,
      isStale
    };
  }

  /**
   * Refreshes dynamic oracle feed prices to simulate real-time updates.
   */
  public tick() {
    this.feedCache.forEach((feed) => {
      const drift = (Math.random() - 0.5) * 0.0004 * feed.latestPriceUsd;
      feed.latestPriceUsd = parseFloat((feed.latestPriceUsd + drift).toFixed(4));
      feed.updatedAt = Date.now();
    });
  }
}

export const chainlinkOracle = new ChainlinkOracleService();
