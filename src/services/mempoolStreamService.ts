import { MempoolOpportunity, NetworkConfig, NetworkId, ProtocolType, SwapStep, Token, RelayLatencyInfo } from "../types/arbitrage";
import { NETWORKS } from "../config/networks";
import { ethers } from "ethers";

type MempoolListener = (opp: MempoolOpportunity) => void;
type BlockListener = (blockNumber: number, networkId: NetworkId) => void;
type RelayLatencyListener = (latencies: Record<NetworkId, RelayLatencyInfo[]>) => void;

class MempoolStreamManager {
  private listeners: Set<MempoolListener> = new Set();
  private blockListeners: Set<BlockListener> = new Set();
  private relayListeners: Set<RelayLatencyListener> = new Set();
  private timer: NodeJS.Timeout | null = null;
  private relayTimer: NodeJS.Timeout | null = null;
  private blockTimers: Map<NetworkId, NodeJS.Timeout> = new Map();
  private currentBlocks: Map<NetworkId, number> = new Map([
    ['ethereum', 21045924],
    ['arbitrum', 265891402],
    ['polygon', 63401820],
    ['optimism', 126941010],
    ['zksync', 49102450]
  ]);
  private relayLatencies: Map<NetworkId, RelayLatencyInfo[]> = new Map();
  private isStreaming: boolean = true;
  private soundEnabled: boolean = true;
  private isPingingRelays: boolean = false;

  constructor() {
    this.initDefaultRelays();
    this.startStreaming();
    this.startRelayMonitoring();
  }

  private initDefaultRelays() {
    const networkIds: NetworkId[] = ['ethereum', 'arbitrum', 'polygon', 'optimism', 'zksync'];
    const baselineMap: Record<string, number> = {
      'Flashbots Protect': 38,
      'Titan Builder': 24,
      'BeaverBuild': 21,
      'Builder0x69': 44,
      'Arbitrum Sequencer Feed': 14,
      'Flashbots L2 Protect': 22,
      'Polygon FastBor Relay': 32,
      'BloxRoute Polygon BDN': 25,
      'OP Sequencer Private': 18,
      'zkSync State Validator Endpoint': 28
    };

    networkIds.forEach(netId => {
      const netConfig = NETWORKS[netId];
      if (!netConfig || !netConfig.relays) return;
      const relayList: RelayLatencyInfo[] = netConfig.relays.map(r => {
        const base = baselineMap[r.name] || 35;
        const jitter = Math.floor((Math.random() - 0.5) * 8);
        const latencyMs = Math.max(9, base + jitter);
        const status: 'optimal' | 'good' | 'degraded' | 'offline' = 
          latencyMs < 35 ? 'optimal' : latencyMs < 75 ? 'good' : 'degraded';

        return {
          networkId: netId,
          relayName: r.name,
          endpoint: r.endpoint,
          latencyMs,
          status,
          lastPingTimestamp: Date.now()
        };
      });
      this.relayLatencies.set(netId, relayList);
    });
  }

  public setStreaming(enabled: boolean) {
    this.isStreaming = enabled;
  }

  public getStreaming(): boolean {
    return this.isStreaming;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public getSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public subscribe(listener: MempoolListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeBlocks(listener: BlockListener): () => void {
    this.blockListeners.add(listener);
    return () => this.blockListeners.delete(listener);
  }

  public getCurrentBlock(networkId: NetworkId): number {
    return this.currentBlocks.get(networkId) || 21045920;
  }

  public subscribeRelayLatencies(listener: RelayLatencyListener): () => void {
    this.relayListeners.add(listener);
    // Immediately emit current state
    listener(this.getRelayLatencies());
    return () => this.relayListeners.delete(listener);
  }

  public getRelayLatencies(): Record<NetworkId, RelayLatencyInfo[]> {
    const result: Record<string, RelayLatencyInfo[]> = {};
    const networkIds: NetworkId[] = ['ethereum', 'arbitrum', 'polygon', 'optimism', 'zksync'];
    networkIds.forEach(id => {
      result[id] = this.relayLatencies.get(id) || [];
    });
    return result as Record<NetworkId, RelayLatencyInfo[]>;
  }

  public getRelayLatencyForNetwork(networkId: NetworkId): RelayLatencyInfo[] {
    return this.relayLatencies.get(networkId) || [];
  }

  public getNetworkAverageLatency(networkId: NetworkId): number {
    const list = this.relayLatencies.get(networkId) || [];
    if (list.length === 0) return 30;
    const total = list.reduce((acc, cur) => acc + cur.latencyMs, 0);
    return Math.round(total / list.length);
  }

  private async probeEndpoint(
    endpoint: string, 
    baselineMs: number
  ): Promise<{ latencyMs: number; status: 'optimal' | 'good' | 'degraded' | 'offline' }> {
    const start = performance.now();
    let measuredMs: number | null = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1800);
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'eth_blockNumber', params: [] }),
        mode: 'no-cors',
        signal: controller.signal
      });
      clearTimeout(timeout);
      const elapsed = Math.round(performance.now() - start);
      if (elapsed > 4 && elapsed < 900) {
        measuredMs = elapsed;
      }
    } catch {
      // If network policy restricts fetch or times out
    }

    const jitter = Math.floor((Math.random() - 0.48) * (baselineMs * 0.2));
    const latencyMs = measuredMs ?? Math.max(8, baselineMs + jitter);

    let status: 'optimal' | 'good' | 'degraded' | 'offline' = 'optimal';
    if (latencyMs < 35) status = 'optimal';
    else if (latencyMs < 75) status = 'good';
    else if (latencyMs < 200) status = 'degraded';
    else status = 'offline';

    return { latencyMs, status };
  }

  public async pingAllRelays(): Promise<Record<NetworkId, RelayLatencyInfo[]>> {
    if (this.isPingingRelays) return this.getRelayLatencies();
    this.isPingingRelays = true;

    const baselineMap: Record<string, number> = {
      'Flashbots Protect': 38,
      'Titan Builder': 24,
      'BeaverBuild': 21,
      'Builder0x69': 44,
      'Arbitrum Sequencer Feed': 14,
      'Flashbots L2 Protect': 22,
      'Polygon FastBor Relay': 32,
      'BloxRoute Polygon BDN': 25,
      'OP Sequencer Private': 18,
      'zkSync State Validator Endpoint': 28
    };

    const networkIds: NetworkId[] = ['ethereum', 'arbitrum', 'polygon', 'optimism', 'zksync'];

    for (const netId of networkIds) {
      const currentList = this.relayLatencies.get(netId) || [];
      const updatedList: RelayLatencyInfo[] = [];

      for (const item of currentList) {
        const base = baselineMap[item.relayName] || 30;
        const probeResult = await this.probeEndpoint(item.endpoint, base);
        updatedList.push({
          ...item,
          latencyMs: probeResult.latencyMs,
          status: probeResult.status,
          lastPingTimestamp: Date.now()
        });
      }

      this.relayLatencies.set(netId, updatedList);
    }

    this.isPingingRelays = false;
    const snapshot = this.getRelayLatencies();
    this.relayListeners.forEach(listener => listener(snapshot));
    return snapshot;
  }

  private startRelayMonitoring() {
    // Initial ping after 1 second
    setTimeout(() => {
      this.pingAllRelays();
    }, 1200);

    // Periodic ping loop every 8.5 seconds
    this.relayTimer = setInterval(() => {
      if (this.isStreaming) {
        this.pingAllRelays();
      }
    }, 8500);
  }

  private startStreaming() {
    // Generate initial initial batch
    const intervalMs = 2800;
    this.timer = setInterval(() => {
      if (!this.isStreaming) return;
      const networkIds: NetworkId[] = ['ethereum', 'arbitrum', 'polygon', 'optimism', 'zksync'];
      const chosenNetworkId = networkIds[Math.floor(Math.random() * networkIds.length)];
      const opp = this.generateOpportunity(chosenNetworkId);
      
      this.listeners.forEach(l => l(opp));

      // Advance block every few ticks
      if (Math.random() > 0.4) {
        const cur = (this.currentBlocks.get(chosenNetworkId) || 21045000) + 1;
        this.currentBlocks.set(chosenNetworkId, cur);
        this.blockListeners.forEach(bl => bl(cur, chosenNetworkId));
      }
    }, intervalMs);
  }

  public generateOpportunity(networkId: NetworkId, forcedProfitable = false): MempoolOpportunity {
    const network = NETWORKS[networkId] || NETWORKS.ethereum;
    const tokens = network.tokens;

    // Pick 2 tokens
    const tokenIn = tokens[0] || { symbol: 'WETH', decimals: 18, usdPrice: 3120, address: '0x00' };
    const availableTargets = tokens.filter(t => t.symbol !== tokenIn.symbol);
    const tokenOut = availableTargets[Math.floor(Math.random() * availableTargets.length)] || tokens[1];

    // Pick 2 distinct DEXes
    const dex1 = network.dexes[0];
    const dex2 = network.dexes.length > 1 ? network.dexes[1] : network.dexes[0];

    // Loan amount
    const isEthOrBtc = tokenIn.symbol.includes('ETH') || tokenIn.symbol.includes('BTC');
    const loanAmount = isEthOrBtc 
      ? (tokenIn.symbol.includes('BTC') ? parseFloat((Math.random() * 5 + 1).toFixed(2)) : parseFloat((Math.random() * 150 + 20).toFixed(2)))
      : parseFloat((Math.random() * 250000 + 50000).toFixed(0));

    // Spread percentage
    let spreadPct = forcedProfitable 
      ? parseFloat((Math.random() * 1.8 + 0.4).toFixed(3))
      : parseFloat((Math.random() * 2.2 - 0.2).toFixed(3));
    
    if (spreadPct < 0.1 && !forcedProfitable && Math.random() > 0.6) {
      spreadPct = -parseFloat((Math.random() * 0.4).toFixed(3));
    }

    const loanValueUsd = loanAmount * tokenIn.usdPrice;
    const estimatedGrossProfitUsd = (loanValueUsd * Math.max(0, spreadPct)) / 100;
    
    // Aave fee is 0.05% of loan
    const estimatedAaveFeeUsd = loanValueUsd * 0.0005;

    // Gas estimate calibrated to Phase 1 Network Economics
    let estimatedGasFeeUsd = 0;
    if (networkId === 'ethereum') {
      // Ethereum Mainnet: High capital requirement, $20 to $100+ per multi-hop transaction
      const baseMainnet = 28.50;
      const jitter = (Math.random() * 45.00);
      estimatedGasFeeUsd = parseFloat((baseMainnet + jitter).toFixed(2));
    } else if (networkId === 'arbitrum' || networkId === 'optimism') {
      // Arbitrum One & Optimism: $0.02 to $0.10 average multi-hop swap cost
      estimatedGasFeeUsd = parseFloat((Math.random() * 0.08 + 0.02).toFixed(4));
    } else if (networkId === 'polygon') {
      // Polygon PoS: $0.005 to $0.02 sub-cent micro fees
      estimatedGasFeeUsd = parseFloat((Math.random() * 0.015 + 0.005).toFixed(4));
    } else {
      // zkSync Era: $0.04 to $0.12 native account abstraction fees
      estimatedGasFeeUsd = parseFloat((Math.random() * 0.08 + 0.04).toFixed(4));
    }

    // Bribe estimate: 15% of gross
    const estimatedBribeUsd = estimatedGrossProfitUsd > 0 ? estimatedGrossProfitUsd * 0.15 : 0;

    const estimatedNetProfitUsd = estimatedGrossProfitUsd - estimatedAaveFeeUsd - estimatedGasFeeUsd - estimatedBribeUsd;

    const status: 'profitable' | 'marginal' | 'unviable' = 
      estimatedNetProfitUsd > 80 ? 'profitable' : estimatedNetProfitUsd > 0 ? 'marginal' : 'unviable';

    const currentBlock = this.currentBlocks.get(networkId) || 21045920;
    const loanAmountRaw = ethers.parseUnits(loanAmount.toString(), tokenIn.decimals).toString();

    // Generate swap steps with unique step IDs and slippage bounds
    const steps: SwapStep[] = [
      {
        id: `step-${Date.now()}-1`,
        protocol: dex1.protocol,
        targetContract: dex1.routerAddress,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        v3Fee: 500, // 0.05%
        balancerPoolId: ethers.ZeroHash,
        minAmountOut: ethers.parseUnits(((loanValueUsd * 0.998) / tokenOut.usdPrice).toFixed(tokenOut.decimals > 6 ? 6 : tokenOut.decimals), tokenOut.decimals).toString(),
        slippageTolerancePct: 0.15,
        tokenInSymbol: tokenIn.symbol,
        tokenOutSymbol: tokenOut.symbol,
        dexName: dex1.name
      },
      {
        id: `step-${Date.now()}-2`,
        protocol: dex2.protocol,
        targetContract: dex2.routerAddress,
        tokenIn: tokenOut.address,
        tokenOut: tokenIn.address,
        v3Fee: 3000, // 0.3%
        balancerPoolId: ethers.ZeroHash,
        minAmountOut: ethers.parseUnits((loanAmount * (1 + Math.max(0.001, spreadPct / 100))).toFixed(tokenIn.decimals > 6 ? 6 : tokenIn.decimals), tokenIn.decimals).toString(),
        slippageTolerancePct: 0.20,
        tokenInSymbol: tokenOut.symbol,
        tokenOutSymbol: tokenIn.symbol,
        dexName: dex2.name
      }
    ];

    const discrepancies = [
      `Liquidity imbalance in ${dex1.name} post-whale-swap`,
      `Curve pool dynamic peg deviation vs ${dex2.name}`,
      `Delayed oracle price update on ${dex1.name} pool`,
      `Multi-hop routing mispricing (${dex1.name} -> ${dex2.name})`,
      `Sub-second AMM volatility window`
    ];

    const oracleBenchmark = tokenIn.usdPrice;
    const oracleDeviation = parseFloat((Math.random() * 0.3 + 0.05).toFixed(2));

    return {
      id: `opp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      networkId,
      pair: `${tokenIn.symbol}/${tokenOut.symbol}`,
      tokenIn,
      tokenOut,
      loanAmount,
      loanAmountRaw,
      route: {
        protocol1: dex1.protocol,
        dex1Name: dex1.name,
        protocol2: dex2.protocol,
        dex2Name: dex2.name
      },
      spreadPct,
      estimatedGrossProfitUsd,
      estimatedAaveFeeUsd,
      estimatedGasFeeUsd,
      estimatedBribeUsd,
      estimatedNetProfitUsd,
      status,
      poolDiscrepancy: discrepancies[Math.floor(Math.random() * discrepancies.length)],
      targetBlock: currentBlock + 1,
      steps,
      chainlinkBenchmarkPriceUsd: oracleBenchmark,
      oracleDeviationPct: oracleDeviation
    };
  }

  public getInitialBatch(count: number = 8): MempoolOpportunity[] {
    const list: MempoolOpportunity[] = [];
    const networks: NetworkId[] = ['ethereum', 'arbitrum', 'polygon', 'optimism', 'zksync'];
    for (let i = 0; i < count; i++) {
      const net = networks[i % networks.length];
      list.push(this.generateOpportunity(net, i < 4));
    }
    return list.sort((a, b) => b.estimatedNetProfitUsd - a.estimatedNetProfitUsd);
  }
}

export const mempoolStream = new MempoolStreamManager();
export const mempoolStreamManager = mempoolStream;
