import { NetworkId } from '../types/arbitrage';

export interface RpcEndpointStatus {
  id: string;
  name: string;
  tier: 'primary' | 'backup' | 'public_fallback';
  url: string;
  protocol: 'wss' | 'https';
  latencyMs: number;
  status: 'active' | 'standby' | 'failed' | 'rate_limited';
  successRatePct: number;
  lastCheckedTimestamp: number;
  consecutiveErrors: number;
}

export interface SmartGasTriggerConfig {
  enabled: boolean;
  maxBaseFeeGwei: number;
  autoCancelOnSpike: boolean;
  spikePercentageThreshold: number; // e.g., 20% spike in 1 block
  autoRerouteToL2: boolean;
}

export interface SmartSlippageTriggerConfig {
  enabled: boolean;
  maxDeviationPct: number; // e.g., 1.5%
  autoCancelOnBreach: boolean;
}

export interface FailoverEventLog {
  id: string;
  timestamp: number;
  networkId: NetworkId;
  fromEndpoint: string;
  toEndpoint: string;
  reason: 'timeout' | 'rate_limit_429' | 'socket_dropped' | 'gas_spike_trigger' | 'slippage_trigger';
  details: string;
}

type FailoverListener = (activeEndpoint: RpcEndpointStatus, allEndpoints: RpcEndpointStatus[]) => void;
type TriggerListener = (log: FailoverEventLog) => void;

class RpcFailoverManager {
  private networkEndpoints: Map<NetworkId, RpcEndpointStatus[]> = new Map();
  private activeEndpointIndex: Map<NetworkId, number> = new Map();
  private listeners: Set<FailoverListener> = new Set();
  private triggerListeners: Set<TriggerListener> = new Set();
  private eventLogs: FailoverEventLog[] = [];
  private gasTriggers: SmartGasTriggerConfig = {
    enabled: true,
    maxBaseFeeGwei: 45,
    autoCancelOnSpike: true,
    spikePercentageThreshold: 20,
    autoRerouteToL2: true
  };
  private slippageTriggers: SmartSlippageTriggerConfig = {
    enabled: true,
    maxDeviationPct: 1.5,
    autoCancelOnBreach: true
  };
  private probeTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initEndpoints();
    this.startHealthProbes();
  }

  private initEndpoints() {
    const defaultTopology: Record<NetworkId, RpcEndpointStatus[]> = {
      arbitrum: [
        {
          id: 'arb-alchemy',
          name: 'Alchemy High-Speed L2 WSS',
          tier: 'primary',
          url: 'wss://arb-mainnet.g.alchemy.com/v2/demo-key',
          protocol: 'wss',
          latencyMs: 14,
          status: 'active',
          successRatePct: 99.9,
          lastCheckedTimestamp: Date.now(),
          consecutiveErrors: 0
        },
        {
          id: 'arb-quicknode',
          name: 'QuickNode Dedicated Backup',
          tier: 'backup',
          url: 'https://arb-mainnet.quiknode.pro/demo-backup/',
          protocol: 'https',
          latencyMs: 22,
          status: 'standby',
          successRatePct: 99.5,
          lastCheckedTimestamp: Date.now(),
          consecutiveErrors: 0
        },
        {
          id: 'arb-public',
          name: 'Arbitrum Foundation Public RPC',
          tier: 'public_fallback',
          url: 'https://arb1.arbitrum.io/rpc',
          protocol: 'https',
          latencyMs: 48,
          status: 'standby',
          successRatePct: 98.2,
          lastCheckedTimestamp: Date.now(),
          consecutiveErrors: 0
        }
      ],
      optimism: [
        {
          id: 'opt-alchemy',
          name: 'Alchemy OP Superchain WSS',
          tier: 'primary',
          url: 'wss://opt-mainnet.g.alchemy.com/v2/demo-key',
          protocol: 'wss',
          latencyMs: 18,
          status: 'active',
          successRatePct: 99.8,
          lastCheckedTimestamp: Date.now(),
          consecutiveErrors: 0
        },
        {
          id: 'opt-infura',
          name: 'Infura Dedicated Fallback',
          tier: 'backup',
          url: 'https://optimism-mainnet.infura.io/v3/demo-key',
          protocol: 'https',
          latencyMs: 26,
          status: 'standby',
          successRatePct: 99.1,
          lastCheckedTimestamp: Date.now(),
          consecutiveErrors: 0
        },
        {
          id: 'opt-public',
          name: 'Optimism Public Gateway',
          tier: 'public_fallback',
          url: 'https://mainnet.optimism.io',
          protocol: 'https',
          latencyMs: 52,
          status: 'standby',
          successRatePct: 97.8,
          lastCheckedTimestamp: Date.now(),
          consecutiveErrors: 0
        }
      ],
      polygon: [
        {
          id: 'pol-alchemy',
          name: 'Alchemy FastBor WSS',
          tier: 'primary',
          url: 'wss://polygon-mainnet.g.alchemy.com/v2/demo-key',
          protocol: 'wss',
          latencyMs: 19,
          status: 'active',
          successRatePct: 99.7,
          lastCheckedTimestamp: Date.now(),
          consecutiveErrors: 0
        },
        {
          id: 'pol-quicknode',
          name: 'QuickNode Bor Backup',
          tier: 'backup',
          url: 'https://polygon-mainnet.quiknode.pro/demo/',
          protocol: 'https',
          latencyMs: 29,
          status: 'standby',
          successRatePct: 98.9,
          lastCheckedTimestamp: Date.now(),
          consecutiveErrors: 0
        },
        {
          id: 'pol-public',
          name: 'Polygon Foundation Public',
          tier: 'public_fallback',
          url: 'https://polygon-rpc.com',
          protocol: 'https',
          latencyMs: 65,
          status: 'standby',
          successRatePct: 96.5,
          lastCheckedTimestamp: Date.now(),
          consecutiveErrors: 0
        }
      ],
      ethereum: [
        {
          id: 'eth-alchemy',
          name: 'Alchemy Nitro Ethereum WSS',
          tier: 'primary',
          url: 'wss://eth-mainnet.g.alchemy.com/v2/demo-key',
          protocol: 'wss',
          latencyMs: 24,
          status: 'active',
          successRatePct: 99.9,
          lastCheckedTimestamp: Date.now(),
          consecutiveErrors: 0
        },
        {
          id: 'eth-infura',
          name: 'Infura Mainnet Secondary',
          tier: 'backup',
          url: 'https://mainnet.infura.io/v3/demo-key',
          protocol: 'https',
          latencyMs: 34,
          status: 'standby',
          successRatePct: 99.3,
          lastCheckedTimestamp: Date.now(),
          consecutiveErrors: 0
        },
        {
          id: 'eth-cloudflare',
          name: 'Cloudflare Public Gateway',
          tier: 'public_fallback',
          url: 'https://cloudflare-eth.com',
          protocol: 'https',
          latencyMs: 58,
          status: 'standby',
          successRatePct: 98.0,
          lastCheckedTimestamp: Date.now(),
          consecutiveErrors: 0
        }
      ],
      zksync: [
        {
          id: 'zk-primary',
          name: 'MatterLabs State Node WSS',
          tier: 'primary',
          url: 'wss://mainnet.era.zksync.io/ws',
          protocol: 'wss',
          latencyMs: 28,
          status: 'active',
          successRatePct: 99.4,
          lastCheckedTimestamp: Date.now(),
          consecutiveErrors: 0
        },
        {
          id: 'zk-backup',
          name: 'Ankr zkSync Global Edge',
          tier: 'backup',
          url: 'https://rpc.ankr.com/zksync_era',
          protocol: 'https',
          latencyMs: 38,
          status: 'standby',
          successRatePct: 98.7,
          lastCheckedTimestamp: Date.now(),
          consecutiveErrors: 0
        },
        {
          id: 'zk-public',
          name: 'zkSync Era Official HTTP',
          tier: 'public_fallback',
          url: 'https://mainnet.era.zksync.io',
          protocol: 'https',
          latencyMs: 62,
          status: 'standby',
          successRatePct: 97.2,
          lastCheckedTimestamp: Date.now(),
          consecutiveErrors: 0
        }
      ]
    };

    Object.entries(defaultTopology).forEach(([netId, endpoints]) => {
      this.networkEndpoints.set(netId as NetworkId, endpoints);
      this.activeEndpointIndex.set(netId as NetworkId, 0);
    });
  }

  private startHealthProbes() {
    this.probeTimer = setInterval(() => {
      this.networkEndpoints.forEach((endpoints, netId) => {
        const activeIdx = this.activeEndpointIndex.get(netId) || 0;
        
        // Add realistic micro-jitter
        endpoints.forEach((ep, idx) => {
          const jitter = Math.floor((Math.random() - 0.48) * 3);
          ep.latencyMs = Math.max(8, ep.latencyMs + jitter);
          ep.lastCheckedTimestamp = Date.now();

          // Occasional simulated failover test
          if (idx === activeIdx && ep.status === 'failed') {
            this.triggerFailover(netId, 'timeout', `Endpoint ${ep.name} exceeded 500ms timeout.`);
          }
        });

        // Notify subscribers
        const active = endpoints[activeIdx] || endpoints[0];
        this.notify(active, endpoints);
      });
    }, 4000);
  }

  public getEndpointsForNetwork(networkId: NetworkId): RpcEndpointStatus[] {
    return this.networkEndpoints.get(networkId) || [];
  }

  public getActiveEndpoint(networkId: NetworkId): RpcEndpointStatus {
    const endpoints = this.getEndpointsForNetwork(networkId);
    const idx = this.activeEndpointIndex.get(networkId) || 0;
    return endpoints[idx] || endpoints[0];
  }

  public triggerFailover(networkId: NetworkId, reason: FailoverEventLog['reason'], details: string): RpcEndpointStatus {
    const endpoints = this.getEndpointsForNetwork(networkId);
    if (endpoints.length <= 1) return endpoints[0];

    const currentIdx = this.activeEndpointIndex.get(networkId) || 0;
    const fromEp = endpoints[currentIdx];
    fromEp.status = reason === 'rate_limit_429' ? 'rate_limited' : 'failed';
    fromEp.consecutiveErrors++;

    // Switch to next standby endpoint
    const nextIdx = (currentIdx + 1) % endpoints.length;
    const toEp = endpoints[nextIdx];
    toEp.status = 'active';

    this.activeEndpointIndex.set(networkId, nextIdx);

    const log: FailoverEventLog = {
      id: `failover-${Date.now()}`,
      timestamp: Date.now(),
      networkId,
      fromEndpoint: fromEp.name,
      toEndpoint: toEp.name,
      reason,
      details
    };

    this.eventLogs.unshift(log);
    if (this.eventLogs.length > 50) this.eventLogs.pop();

    this.notifyTriggers(log);
    this.notify(toEp, endpoints);

    return toEp;
  }

  public evaluateSmartGasTrigger(currentGasGwei: number, previousGasGwei: number): { cancel: boolean; message?: string } {
    if (!this.gasTriggers.enabled) return { cancel: false };

    if (currentGasGwei > this.gasTriggers.maxBaseFeeGwei) {
      return {
        cancel: true,
        message: `Gas circuit breaker tripped: ${currentGasGwei.toFixed(1)} gwei > ${this.gasTriggers.maxBaseFeeGwei} gwei max cap.`
      };
    }

    const spikePct = ((currentGasGwei - previousGasGwei) / Math.max(1, previousGasGwei)) * 100;
    if (this.gasTriggers.autoCancelOnSpike && spikePct > this.gasTriggers.spikePercentageThreshold) {
      return {
        cancel: true,
        message: `Smart gas trigger: Sudden ${spikePct.toFixed(1)}% gas spike detected (+${spikePct.toFixed(0)}% in 1 block). Auto-cancelling bundle to protect capital.`
      };
    }

    return { cancel: false };
  }

  public evaluateSlippageTrigger(currentSpreadPct: number, initialSpreadPct: number): { cancel: boolean; message?: string } {
    if (!this.slippageTriggers.enabled) return { cancel: false };

    const deviationPct = Math.abs(currentSpreadPct - initialSpreadPct);
    if (this.slippageTriggers.autoCancelOnBreach && deviationPct > this.slippageTriggers.maxDeviationPct) {
      return {
        cancel: true,
        message: `Smart slippage trigger: Route deviation ${deviationPct.toFixed(2)}% breached max allowed threshold of ${this.slippageTriggers.maxDeviationPct}%.`
      };
    }

    return { cancel: false };
  }

  public getEventLogs(): FailoverEventLog[] {
    return [...this.eventLogs];
  }

  public getGasTriggers(): SmartGasTriggerConfig {
    return { ...this.gasTriggers };
  }

  public updateGasTriggers(config: Partial<SmartGasTriggerConfig>) {
    this.gasTriggers = { ...this.gasTriggers, ...config };
  }

  public subscribe(listener: FailoverListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeTriggers(listener: TriggerListener): () => void {
    this.triggerListeners.add(listener);
    return () => this.triggerListeners.delete(listener);
  }

  private notify(active: RpcEndpointStatus, all: RpcEndpointStatus[]) {
    this.listeners.forEach(l => l(active, all));
  }

  private notifyTriggers(log: FailoverEventLog) {
    this.triggerListeners.forEach(l => l(log));
  }
}

export const rpcFailoverService = new RpcFailoverManager();
